#!/usr/bin/env python3
"""タレント台帳から「今日送ってよい相手」だけを抜き出す送付キュー生成ツール。

元ファイル（~/dm-ops/talent-master/ の6ファイル）は読むだけで一切書き換えない。
出力はすべて <master>/out/ に作る。DMの送信そのものは行わない。

使い方:
  python3 talent_queue.py inspect  [--master DIR]
  python3 talent_queue.py queue    --campaign IGG [--master DIR] [--cap N] [--dry-run]
  python3 talent_queue.py record   --campaign IGG --key @handle --result sent|failed|unknown [--note ...]
  python3 talent_queue.py gap-ok   --checked-by 名前 --note "7/11以降の送付をX送信済みBOXで確認"

安全装置（どれか1つでも該当すれば送付キューに入れない＝保留リストへ）:
  1. 送付不明・再送禁止リストに載っている
  2. 要確認リストに載っている（解消済みでない）
  3. 両案件の送付証跡がある
  4. 同じ案件で接触履歴 or 本ツールの送信ログがある
  5. 直近 cooldown_days 以内にどの案件でも接触している
  6. X / YouTube / タレントID のどれも無い（識別子不足）、または送付先（X/YouTube）が無い
  7. 同名の行が複数あり、識別子で区別できない
  8. 接触履歴の案件名がどの案件にも当てはまらない（案件不明）
  列名は config の候補 → 列名のキーワード → 中身（x.com/〜・youtube.com/〜 等）の順で自動判定する。
  照合用ファイルで識別子の列が1つも判定できないときは、除外漏れを防ぐため本番の queue を止める。
  照合は ID・Xハンドル・YouTube・正規化した名前 のどれか1つでも一致すれば除外（安全側）。

さらに、送信ログの空白期間（log_cutoff 以降）が未確認のうちは queue は
--dry-run でしか動かない。gap-ok で確認記録を残すと解除される。
"""

import argparse
import csv
import datetime as dt
import fnmatch
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

DEFAULT_MASTER = os.path.expanduser("~/dm-ops/talent-master")
HERE = os.path.dirname(os.path.abspath(__file__))

LOG_FIELDS = ["logged_at", "campaign", "key", "name", "x_handle", "youtube", "talent_id", "result", "note"]


# ---------- 読み込み ----------

def load_config(master):
    for path in (os.path.join(master, "config.json"), os.path.join(HERE, "config.json"),
                 os.path.join(HERE, "config.example.json")):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                cfg = json.load(f)
            cfg["_path"] = path
            return cfg
    sys.exit("config.json が見つかりません（config.example.json をコピーしてください）")


def read_table(path):
    """CSV / TSV / XLSX を dict の list で返す。文字コードは utf-8-sig → cp932 の順に試す。"""
    if path.lower().endswith((".xlsx", ".xlsm")):
        try:
            import openpyxl
        except ImportError:
            sys.exit(f"{os.path.basename(path)} は xlsx です。`pip3 install openpyxl` するか CSV で書き出してください")
        ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
        rows = [["" if v is None else str(v) for v in r] for r in ws.iter_rows(values_only=True)]
        if not rows:
            return [], []
        header = [h.strip() for h in rows[0]]
        return header, [dict(zip(header, r)) for r in rows[1:] if any(c.strip() for c in r)]
    delim = "\t" if path.lower().endswith(".tsv") else ","
    for enc in ("utf-8-sig", "cp932"):
        try:
            with open(path, encoding=enc, newline="") as f:
                reader = csv.DictReader(f, delimiter=delim)
                rows = [r for r in reader if any((v or "").strip() for v in r.values())]
                header = [h.strip() for h in (reader.fieldnames or [])]
            return header, [{(k or "").strip(): (v or "") for k, v in r.items()} for r in rows]
        except UnicodeDecodeError:
            continue
    sys.exit(f"{path} の文字コードを判別できません")


def find_file(master, patterns):
    if isinstance(patterns, str):
        patterns = [patterns]
    names = sorted(n for n in os.listdir(master) if os.path.isfile(os.path.join(master, n)))
    hits = [n for n in names for p in patterns if fnmatch.fnmatch(n, p)]
    hits = list(dict.fromkeys(hits))
    if len(hits) > 1:
        sys.exit(f"パターン {patterns} に複数ファイルが一致しました: {hits}\nconfig.json の files を具体的な名前にしてください")
    return os.path.join(master, hits[0]) if hits else None


def pick(row, candidates):
    for c in candidates:
        v = row.get(c)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


# ---------- 列の自動判定 ----------

HEADER_KEYWORDS = {
    "id": ["タレントid", "talentid", "talent_id"],
    "name": ["名前", "氏名", "タレント名", "活動名", "名義", "表示名", "name"],
    "x_handle": ["twitter", "ツイッター", "xid", "xアカウント", "xハンドル", "xurl", "xのid", "x(旧twitter)"],
    "youtube": ["youtube", "ユーチューブ", "チャンネル"],
    "campaign": ["案件", "campaign", "キャンペーン"],
    "sent_at": ["日時", "日付", "送信日", "送付日", "接触日", "date"],
    "review_status": ["対応状況", "確認状況", "ステータス", "status", "状態"],
    "review_reason": ["要確認理由", "理由", "確認事項", "reason"],
}
X_URL = re.compile(r"(?:x|twitter)\.com/", re.I)
YT_URL = re.compile(r"youtube\.com/|youtu\.be/|^UC[A-Za-z0-9_-]{22}$")
AT_HANDLE = re.compile(r"^[@＠][A-Za-z0-9_]{1,15}$")


def _hkey(h):
    return re.sub(r"\s", "", unicodedata.normalize("NFKC", h or "")).lower()


def resolve_columns(header, rows, cols):
    """役割ごとに読む列（優先順）と、その判定根拠を返す。"""
    resolved, source = {}, {}
    for role, cands in cols.items():
        found = [c for c in cands if c in header]
        how = "設定" if found else ""
        for h in header:
            if h in found:
                continue
            hk = _hkey(h)
            if any(k in hk for k in HEADER_KEYWORDS.get(role, [])) or (role == "x_handle" and hk == "x"):
                found.append(h)
                how = how or "列名から推定"
        resolved[role], source[role] = found, how
    # 中身からの推定（X / YouTube の列が列名で見つからなかったときだけ）
    used = {c for v in resolved.values() for c in v}
    sample = rows[:300]
    for h in header:
        if h in used:
            continue
        vals = [str(r.get(h) or "").strip() for r in sample]
        vals = [v for v in vals if v]
        if len(vals) < 3:
            continue
        ratio = lambda rx: sum(1 for v in vals if rx.search(unicodedata.normalize("NFKC", v))) / len(vals)
        if ratio(YT_URL) >= 0.6:
            resolved["youtube"].append(h)
            source["youtube"] = source["youtube"] or "中身から推定"
        elif ratio(X_URL) >= 0.6 or (not resolved["x_handle"] and ratio(AT_HANDLE) >= 0.6):
            resolved["x_handle"].append(h)
            source["x_handle"] = source["x_handle"] or "中身から推定"
    return resolved, source


def has_identifier(resolved):
    return any(resolved[r] for r in ("id", "name", "x_handle", "youtube"))


# ---------- 正規化 ----------

def norm_x(v):
    v = unicodedata.normalize("NFKC", v or "").strip()
    m = re.search(r"(?:x|twitter)\.com/@?([A-Za-z0-9_]{1,15})", v)
    if m:
        v = m.group(1)
    v = v.lstrip("@").lower()
    return v if re.fullmatch(r"[a-z0-9_]{1,15}", v) else ""


def norm_yt(v):
    v = unicodedata.normalize("NFKC", v or "").strip()
    m = re.search(r"youtube\.com/(channel/[A-Za-z0-9_-]+|@[^/?#\s]+|c/[^/?#\s]+|user/[^/?#\s]+)", v)
    if m:
        v = m.group(1)
    elif v.startswith("UC") and len(v) == 24:
        v = "channel/" + v
    elif v and not v.startswith("@") and "/" not in v and " " not in v:
        v = "@" + v
    return v.lower()


def norm_name(v):
    v = unicodedata.normalize("NFKC", v or "")
    v = re.sub(r"[\s・･_\-‐ー〜~]", "", v)
    return v.lower()


class Ident:
    """1行分の識別子。keys() は照合用の (種別, 値) 集合。"""

    def __init__(self, row, cols):
        self.row = row
        self.talent_id = pick(row, cols["id"])
        self.name = pick(row, cols["name"])
        self.x = norm_x(pick(row, cols["x_handle"]))
        self.yt = norm_yt(pick(row, cols["youtube"]))

    def strong_keys(self):
        ks = set()
        if self.talent_id:
            ks.add(("id", self.talent_id))
        if self.x:
            ks.add(("x", self.x))
        if self.yt:
            ks.add(("yt", self.yt))
        return ks

    def keys(self):
        ks = self.strong_keys()
        if norm_name(self.name):
            ks.add(("name", norm_name(self.name)))
        return ks

    def reachable(self):
        return bool(self.x or self.yt)

    def primary(self):
        if self.x:
            return "@" + self.x
        if self.yt:
            return "yt:" + self.yt
        if self.talent_id:
            return "id:" + self.talent_id
        return "name:" + self.name


class KeyIndex:
    def __init__(self):
        self.map = defaultdict(list)

    def add(self, ident, info):
        for k in ident.keys():
            self.map[k].append(info)

    def hits(self, ident):
        out = []
        for k in ident.keys():
            out.extend(self.map.get(k, []))
        return out


def parse_date(v):
    v = unicodedata.normalize("NFKC", v or "").strip()
    m = re.search(r"(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})", v)
    if not m:
        return None
    try:
        return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


# ---------- 状態の組み立て ----------

def gap_state_path(master):
    return os.path.join(master, "out", "gap_check.json")


def send_log_path(master):
    return os.path.join(master, "out", "send_log.csv")


def build_state(master, cfg):
    cols = cfg["columns"]
    files = cfg["files"]
    state = {"blocked": KeyIndex(), "review": KeyIndex(), "both": KeyIndex(),
             "contacts": KeyIndex(), "missing": [], "unmatchable": []}

    def load(kind):
        path = find_file(master, files[kind])
        if not path:
            state["missing"].append(kind)
            return [], cols
        header, rows = read_table(path)
        rc, _ = resolve_columns(header, rows, cols)
        if rows and not has_identifier(rc):
            state["unmatchable"].append(f"{kind}（{os.path.basename(path)}）")
        return rows, rc

    rows, c = load("blocked")
    for r in rows:
        state["blocked"].add(Ident(r, c), {"reason": "送付不明・再送禁止"})

    resolved = [unicodedata.normalize("NFKC", s).lower() for s in cfg.get("review_resolved_values", [])]
    rows, c = load("review")
    for r in rows:
        status = unicodedata.normalize("NFKC", pick(r, c["review_status"])).lower()
        if status and status in resolved:
            continue
        detail = pick(r, c["review_reason"]) or "要確認"
        state["review"].add(Ident(r, c), {"reason": f"要確認: {detail}"})

    rows, c = load("both_sent")
    for r in rows:
        state["both"].add(Ident(r, c), {"reason": "両案件の送付証跡あり"})

    rows, c = load("contacts")
    for r in rows:
        state["contacts"].add(Ident(r, c), {
            "campaign": pick(r, c["campaign"]),
            "date": parse_date(pick(r, c["sent_at"])),
            "source": "接触履歴",
        })

    # 本ツールで記録した送信ログも接触履歴として扱う（unknown は再送禁止扱い）
    log = send_log_path(master)
    if os.path.exists(log):
        for r in read_table(log)[1]:
            ident = Ident({"id": r.get("talent_id", ""), "name": r.get("name", ""),
                           "x": r.get("x_handle", ""), "yt": r.get("youtube", "")},
                          {"id": ["id"], "name": ["name"], "x_handle": ["x"], "youtube": ["yt"]})
            if r.get("result") in ("sent", "unknown"):
                state["contacts"].add(ident, {"campaign": r.get("campaign", ""),
                                              "date": parse_date(r.get("logged_at", "")),
                                              "source": "送信ログ"})
            if r.get("result") == "unknown":
                state["blocked"].add(ident, {"reason": "送付不明（送信ログ）・再送禁止"})
    return state


def campaign_names(cfg, campaign):
    return [norm_name(n) for n in [campaign] + cfg["campaigns"].get(campaign, [])]


def campaign_matches(value, campaign, cfg):
    v = norm_name(value)
    if not v:
        return False
    # 1文字の案件名は部分一致だと誤爆するので完全一致のみ
    return any(n and (v == n if len(n) == 1 else n in v) for n in campaign_names(cfg, campaign))


def match_campaigns(value, cfg):
    return [c for c in cfg["campaigns"] if campaign_matches(value, c, cfg)]


def resolve_campaign(cfg, value):
    """--campaign に渡された正式名・略称を正式名に揃える。知らない名前は止める（打ち間違い対策）。"""
    v = norm_name(value)
    for c in cfg["campaigns"]:
        if v in campaign_names(cfg, c):
            return c
    sys.exit(f"案件名 '{value}' は設定にありません。使える名前: " +
             " / ".join(f"{c}（{', '.join(cfg['campaigns'][c]) or '-'}）" for c in cfg["campaigns"]))


def classify(master, cfg, campaign, today):
    cols = cfg["columns"]
    state = build_state(master, cfg)
    ledger_path = find_file(master, cfg["files"]["ledger"])
    if not ledger_path:
        sys.exit("台帳ファイルが見つかりません（config.json の files.ledger を確認）")
    header, ledger = read_table(ledger_path)
    lc, _ = resolve_columns(header, ledger, cols)
    state["ledger_reachable"] = bool(lc["x_handle"] or lc["youtube"])
    cooldown = int(cfg.get("cooldown_days", 30))

    idents = [Ident(r, lc) for r in ledger]

    # 同名チェック: 同じ正規化名の行があり、どれかに送付先（X/YouTube）が無い → どれが本人か決められない
    by_name = defaultdict(list)
    for i in idents:
        if norm_name(i.name):
            by_name[norm_name(i.name)].append(i)
    ambiguous_names = set()
    for n, group in by_name.items():
        if len(group) < 2:
            continue
        if any(not g.reachable() for g in group):
            ambiguous_names.add(n)

    ok, held, seen = [], [], set()
    for i in idents:
        reasons = []
        if not i.strong_keys():
            reasons.append("識別子不足（X/YouTube/IDなし）")
        elif not i.reachable():
            reasons.append("送付先なし（X/YouTubeなし）")
        if norm_name(i.name) in ambiguous_names:
            reasons.append("同名あり・識別子で区別不可")
        for kind in ("blocked", "review", "both"):
            for h in state[kind].hits(i):
                reasons.append(h["reason"])
        for h in state["contacts"].hits(i):
            hit = match_campaigns(h["campaign"], cfg)
            if campaign in hit:
                reasons.append(f"{campaign}は送付済み（{h['source']}）")
            elif not hit:
                reasons.append(f"案件不明の接触あり（{h['source']}: {h['campaign'] or '空欄'}）")
            if h["date"] and (today - h["date"]).days < cooldown:
                reasons.append(f"直近{cooldown}日以内に接触（{h['date']}）")
        pk = i.primary()
        if pk in seen:
            reasons.append("台帳内の重複行")
        seen.add(pk)
        rec = {"key": pk, "name": i.name, "x_handle": i.x and "@" + i.x, "youtube": i.yt,
               "talent_id": i.talent_id, "reasons": " / ".join(dict.fromkeys(reasons))}
        (held if reasons else ok).append(rec)
    return ok, held, state


# ---------- コマンド ----------

def cmd_inspect(args, cfg):
    master = args.master
    print(f"設定: {cfg['_path']}\nフォルダ: {master}\n")
    problems = []
    for kind, pat in cfg["files"].items():
        path = find_file(master, pat)
        if not path:
            print(f"[{kind}] 見つかりません（パターン {pat}）\n")
            problems.append(f"{kind} のファイルが見つからない")
            continue
        header, rows = read_table(path)
        rc, how = resolve_columns(header, rows, cfg["columns"])
        print(f"[{kind}] {os.path.basename(path)}  {len(rows)}行")
        print("   列: " + ", ".join(header))
        for role, found in rc.items():
            if found:
                print(f"   {role:14s} → {', '.join(found)}（{how[role]}）")
        if kind == "ledger" and not (rc["x_handle"] or rc["youtube"]):
            problems.append("台帳に X / YouTube の列が見つからない（送付先が特定できない）")
        elif not has_identifier(rc):
            problems.append(f"{kind} に照合できる列（ID/名前/X/YouTube）が無い")
        if kind == "contacts":
            if not rc["campaign"]:
                problems.append("接触履歴に案件列が無い（全件『案件不明』で保留になる）")
            else:
                counts = defaultdict(int)
                for r in rows:
                    counts[pick(r, rc["campaign"])] += 1
                print("   案件列の値 → 判定:")
                for v, n in sorted(counts.items(), key=lambda x: -x[1]):
                    hit = match_campaigns(v, cfg)
                    label = " / ".join(hit) if hit else "案件不明（保留扱い）"
                    print(f"      {v or '(空欄)'}: {n}件 → {label}")
        print()
    assigned = {find_file(master, p) for p in cfg["files"].values()}
    others = [n for n in sorted(os.listdir(master))
              if os.path.isfile(os.path.join(master, n)) and os.path.join(master, n) not in assigned
              and n != "config.json"]
    if others:
        print("どの役割にも割り当てられていないファイル: " + ", ".join(others) + "\n")
    print("案件: " + " / ".join(cfg["campaigns"]))
    gap = gap_state_path(master)
    print("送信ログ空白期間の確認: " + ("済み" if os.path.exists(gap) else f"未確認（{cfg['log_cutoff']} 以降）"))
    if problems:
        print("\n要対応:")
        for m in problems:
            print("  - " + m)
    else:
        print("\n列の判定に問題はありません。上の『→』が正しいかだけ目で確認してください。")


def write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def cmd_queue(args, cfg):
    master = args.master
    today = dt.date.today()
    gap_ok = os.path.exists(gap_state_path(master))
    if not gap_ok and not args.dry_run:
        sys.exit(f"停止: {cfg['log_cutoff']} より後の送信ログが未確認です。\n"
                 "X/YouTube の送信済みBOXで空白期間の送付を確認し、接触履歴に反映してから\n"
                 "  python3 talent_queue.py gap-ok --checked-by 名前 --note 確認内容\n"
                 "を実行してください。中身だけ見たい場合は --dry-run を付けてください。")

    campaign = resolve_campaign(cfg, args.campaign)
    ok, held, state = classify(master, cfg, campaign, today)
    stops = []
    if state["missing"]:
        stops.append("照合用ファイルが見つかりません: " + ", ".join(state["missing"]))
    if state["unmatchable"]:
        stops.append("照合できる列が判定できないファイル: " + ", ".join(state["unmatchable"]))
    if not state["ledger_reachable"]:
        stops.append("台帳に X / YouTube の列が見つかりません")
    for m in stops:
        if not args.dry_run:
            sys.exit(f"停止: {m}（除外漏れの恐れ。inspect で列を確認し config.json を直してください）")
        print(f"警告: {m}")

    cap = args.cap if args.cap is not None else int(cfg.get("daily_cap", 20))
    batch, rest = ok[:cap], ok[cap:]
    stamp = today.isoformat()
    tag = "DRYRUN_" if args.dry_run or not gap_ok else ""
    out = os.path.join(master, "out")
    fields = ["key", "name", "x_handle", "youtube", "talent_id", "reasons"]
    qpath = os.path.join(out, f"{tag}queue_{campaign}_{stamp}.csv")
    hpath = os.path.join(out, f"{tag}held_{campaign}_{stamp}.csv")
    write_csv(qpath, batch, fields)
    write_csv(hpath, held, fields)

    counts = defaultdict(int)
    for h in held:
        for r in h["reasons"].split(" / "):
            counts[re.sub(r"（.*?）|: .*", "", r)] += 1
    print(f"案件 {campaign} / {stamp}{' / DRY RUN（送信禁止）' if tag else ''}")
    print(f"  台帳 {len(ok) + len(held)}名 → 送付可 {len(ok)}名（本日分 {len(batch)}名・上限 {cap}）/ 保留 {len(held)}名")
    for r, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"    保留理由 {r}: {n}")
    print(f"  送付キュー: {qpath}\n  保留リスト: {hpath}")
    if rest:
        print(f"  （残り {len(rest)}名は翌日以降）")


def cmd_record(args, cfg):
    args.campaign = resolve_campaign(cfg, args.campaign)
    path = send_log_path(args.master)
    new = not os.path.exists(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    row = {"logged_at": dt.datetime.now().isoformat(timespec="seconds"), "campaign": args.campaign,
           "key": args.key, "name": args.name or "", "x_handle": args.key if args.key.startswith("@") else "",
           "youtube": args.key[3:] if args.key.startswith("yt:") else "",
           "talent_id": args.key[3:] if args.key.startswith("id:") else "",
           "result": args.result, "note": args.note or ""}
    with open(path, "a", encoding="utf-8-sig" if new else "utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        if new:
            w.writeheader()
        w.writerow(row)
    print(f"記録しました: {args.key} {args.campaign} {args.result} → {path}")
    if args.result == "unknown":
        print("  送付不明のため、以後この相手は全案件で再送禁止として扱われます。")


def cmd_gap_ok(args, cfg):
    path = gap_state_path(args.master)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rec = {"checked_at": dt.datetime.now().isoformat(timespec="seconds"),
           "checked_by": args.checked_by, "log_cutoff": cfg["log_cutoff"], "note": args.note}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)
    print(f"空白期間の確認を記録しました: {path}")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--master", default=DEFAULT_MASTER)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("inspect")
    q = sub.add_parser("queue")
    q.add_argument("--campaign", required=True)
    q.add_argument("--cap", type=int)
    q.add_argument("--dry-run", action="store_true")
    r = sub.add_parser("record")
    r.add_argument("--campaign", required=True)
    r.add_argument("--key", required=True, help="送付キューの key 列（@handle / yt:... / id:...）")
    r.add_argument("--result", required=True, choices=["sent", "failed", "unknown"])
    r.add_argument("--name")
    r.add_argument("--note")
    g = sub.add_parser("gap-ok")
    g.add_argument("--checked-by", required=True)
    g.add_argument("--note", required=True)
    for sp in (q, r, g, sub.choices["inspect"]):
        sp.add_argument("--master", default=argparse.SUPPRESS)
    args = p.parse_args(argv)
    args.master = os.path.expanduser(args.master)
    if not os.path.isdir(args.master):
        sys.exit(f"フォルダが見つかりません: {args.master}")
    cfg = load_config(args.master)
    {"inspect": cmd_inspect, "queue": cmd_queue, "record": cmd_record, "gap-ok": cmd_gap_ok}[args.cmd](args, cfg)


if __name__ == "__main__":
    main()
