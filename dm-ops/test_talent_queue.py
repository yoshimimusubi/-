"""talent_queue.py の動作確認。実データは使わず、一時フォルダに架空の6ファイルを作って検証する。

  python3 -m unittest dm-ops/test_talent_queue.py
"""

import csv
import datetime as dt
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import talent_queue as tq  # noqa: E402

OLD = "2026-06-01"


def write(path, header, rows, enc="utf-8-sig"):
    with open(path, "w", encoding=enc, newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


class QueueTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.write_config()
        write(os.path.join(self.d, "タレント台帳.csv"), ["タレントID", "タレント名", "Xハンドル", "YouTube"], [
            ["T1", "あおい", "@aoi_ch", ""],                       # 送付可
            ["T2", "みどり", "https://x.com/Midori_V", ""],         # 再送禁止
            ["T3", "くろ", "", "https://www.youtube.com/@kuro"],   # 要確認
            ["T4", "しろ", "@shiro", ""],                           # 両案件送付済み
            ["T5", "あか", "@aka", ""],                             # IGG送付済み
            ["", "ななし", "", ""],                                 # 識別子不足
            ["T7", "さくら", "@sakura1", ""],                       # 同名（片方識別子なし）
            ["", "さくら", "", ""],
            ["T9", "きいろ", "@kiiro", ""],                         # プリントだけ送付・古い → IGG は可
            ["T10", "もも", "@momo", ""],                          # 名前だけで要確認に一致 → 保留
            ["T11", "なぞ", "@nazo", ""],                          # 案件名がどれにも当たらない接触 → 保留
            ["T12", "IDだけ", "", ""],                             # 送付先なし
        ])
        write(os.path.join(self.d, "接触履歴.csv"), ["Xハンドル", "案件", "送信日時"], [
            ["aka", "IGGゲームイベント", OLD], ["@KIIRO", "コンテンツプリント", OLD],
            ["@nazo", "その他", OLD],
        ])
        write(os.path.join(self.d, "要確認.csv"), ["タレント名", "YouTube", "要確認理由", "対応状況"], [
            ["", "https://youtube.com/@kuro/videos", "同名", ""],
            ["も も", "", "識別子不足", ""],
            ["あおい", "", "旧表記", "解消"],
        ], enc="cp932")
        write(os.path.join(self.d, "送付不明_再送禁止.csv"), ["タレント名", "Xハンドル"], [["", "@midori_v"]])
        write(os.path.join(self.d, "両案件送付済み.csv"), ["Xハンドル"], [["shiro"]])

    def write_config(self, **override):
        # 旧形式の台帳（列が少ない）なので talent_master 用の ledger_rules は外して検証する
        with open(os.path.join(os.path.dirname(tq.__file__), "config.example.json"), encoding="utf-8") as f:
            cfg = json.load(f)
        cfg.pop("ledger_rules")
        cfg.update(override)
        with open(os.path.join(self.d, "config.json"), "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False)

    def tearDown(self):
        shutil.rmtree(self.d)

    def run_cli(self, *argv):
        buf = io.StringIO()
        with redirect_stdout(buf):
            tq.main(["--master", self.d, *argv])
        return buf.getvalue()

    def classify(self, campaign="IGGゲームイベント"):
        cfg = tq.load_config(self.d)
        ok, held, _ = tq.classify(self.d, cfg, campaign, dt.date(2026, 9, 27))
        return {r["key"] for r in ok}, {r["key"]: r["reasons"] for r in held}

    def test_only_safe_rows_are_queued(self):
        ok, held = self.classify()
        self.assertEqual(ok, {"@aoi_ch"})
        self.assertIn("他案件で接触あり", held["@kiiro"])
        self.assertIn("再送禁止", held["@midori_v"])
        self.assertIn("要確認", held["yt:@kuro"])
        self.assertIn("両案件", held["@shiro"])
        self.assertIn("IGGゲームイベントは送付済み", held["@aka"])
        self.assertIn("案件不明", held["@nazo"])
        self.assertIn("送付先なし", held["id:T12"])
        self.assertIn("識別子不足", held["name:ななし"])
        self.assertIn("同名", held["@sakura1"])
        self.assertIn("要確認", held["@momo"])

    def test_other_campaign_history_blocks_that_campaign(self):
        ok, held = self.classify("コンテンツプリント")
        self.assertIn("コンテンツプリントは送付済み", held["@kiiro"])
        self.assertIn("他案件で接触あり", held["@aka"])
        self.write_config(hold_if_other_campaign_contacted=False)
        ok, held = self.classify("コンテンツプリント")
        self.assertIn("@aka", ok)  # 古い他案件接触は cooldown を過ぎていれば可

    def test_queue_refuses_until_gap_checked(self):
        with self.assertRaises(SystemExit):
            self.run_cli("queue", "--campaign", "IGG")
        out = self.run_cli("queue", "--campaign", "IGG", "--dry-run")
        self.assertIn("DRY RUN", out)
        self.assertTrue(any(n.startswith("DRYRUN_queue_IGGゲームイベント") for n in os.listdir(os.path.join(self.d, "out"))))
        self.run_cli("gap-ok", "--checked-by", "test", "--note", "確認")
        out = self.run_cli("queue", "--campaign", "IGG", "--cap", "1")
        self.assertIn("本日分 1名", out)

    def test_record_prevents_resend_and_unknown_blocks_all(self):
        self.run_cli("record", "--campaign", "IGG", "--key", "@aoi_ch", "--result", "sent")
        self.run_cli("record", "--campaign", "プリント", "--key", "@kiiro", "--result", "unknown")
        self.write_config(hold_if_other_campaign_contacted=False)
        ok, held = self.classify()
        self.assertEqual(ok, set())
        self.assertIn("IGGゲームイベントは送付済み", held["@aoi_ch"])
        self.assertIn("再送禁止", held["@kiiro"])

    def test_missing_reference_file_stops_real_run(self):
        os.remove(os.path.join(self.d, "接触履歴.csv"))
        self.run_cli("gap-ok", "--checked-by", "test", "--note", "確認")
        with self.assertRaises(SystemExit):
            self.run_cli("queue", "--campaign", "IGG")

    def test_originals_untouched(self):
        before = {n: os.path.getmtime(os.path.join(self.d, n)) for n in os.listdir(self.d)}
        self.run_cli("queue", "--campaign", "IGG", "--dry-run")
        self.run_cli("record", "--campaign", "IGG", "--key", "@aoi_ch", "--result", "sent")
        after = {n: os.path.getmtime(os.path.join(self.d, n)) for n in before}
        self.assertEqual(before, after)

    def test_unknown_campaign_name_is_rejected(self):
        with self.assertRaises(SystemExit):
            self.run_cli("queue", "--campaign", "IGGイベンド", "--dry-run")

    def test_unknown_ledger_headers_detected_from_values(self):
        write(os.path.join(self.d, "タレント台帳.csv"), ["No", "表示名", "リンク1", "リンク2"], [
            ["1", "あおい", "https://x.com/aoi_ch", "https://youtube.com/@aoi"],
            ["2", "しろ", "https://twitter.com/shiro", ""],
            ["3", "みどり", "https://x.com/midori_v", "https://youtube.com/@mdr"],
        ])
        ok, held = self.classify()
        self.assertEqual(ok, {"@aoi_ch"})
        self.assertIn("両案件", held["@shiro"])
        self.assertIn("再送禁止", held["@midori_v"])

    def test_reference_file_without_identifier_stops_real_run(self):
        write(os.path.join(self.d, "要確認.csv"), ["備考"], [["誰か"]])
        self.run_cli("gap-ok", "--checked-by", "test", "--note", "確認")
        with self.assertRaises(SystemExit):
            self.run_cli("queue", "--campaign", "IGG")
        out = self.run_cli("queue", "--campaign", "IGG", "--dry-run")
        self.assertIn("照合できる列", out)

    def test_inspect_reports_campaign_mapping(self):
        out = self.run_cli("inspect")
        self.assertIn("その他: 1件 → 案件不明", out)
        self.assertIn("IGGゲームイベント: 1件 → IGGゲームイベント", out)

    def test_normalizers(self):
        self.assertEqual(tq.norm_x("https://twitter.com/Foo_Bar?s=20"), "foo_bar")
        self.assertEqual(tq.norm_x("ＡＢＣ"), "abc")
        self.assertEqual(tq.norm_yt("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"),
                         "channel/ucabcdefghijklmnopqrstuv")
        self.assertEqual(tq.norm_name("白衣 ゆい"), tq.norm_name("白衣ゆい"))



class TalentMasterSchemaTest(unittest.TestCase):
    """統合済み talent_master.csv 形式（2026-09-27 版の列構成）での判定。"""

    H = ["talent_id", "display_name", "x_handle", "x_url", "youtube_url", "x_followers", "is_individual",
         "is_japanese_activity", "activity_status", "dm_open", "fit_igg", "fit_content_print", "igg_status",
         "content_print_status", "do_not_contact", "notes"]

    def row(self, tid, name, x, notes="IGG元リスト優先度=B", **kw):
        base = dict(talent_id=tid, display_name=name, x_handle=x, x_url=f"https://x.com/{x}" if x else "",
                    youtube_url="", x_followers="5000", is_individual="yes", is_japanese_activity="yes",
                    activity_status="活動中", dm_open="yes", fit_igg="yes", fit_content_print="yes",
                    igg_status="未接触", content_print_status="未接触", do_not_contact="no", notes=notes)
        base.update(kw)
        return [base[h] for h in self.H]

    def setUp(self):
        self.d = tempfile.mkdtemp()
        shutil.copy(os.path.join(os.path.dirname(tq.__file__), "config.example.json"),
                    os.path.join(self.d, "config.json"))
        write(os.path.join(self.d, "talent_master.csv"), self.H, [
            self.row("T1", "いち", "ichi"),                                        # 可（優先度B）
            self.row("T2", "に", "ni", notes="IGG元リスト優先度=A"),                 # 可（優先度A → 先頭）
            self.row("T3", "さん", "san", notes="送信不可（オプトイン未記録）"),
            self.row("T4", "よん", "yon", fit_igg="unknown"),
            self.row("T5", "ご", "go", is_individual="unknown"),
            self.row("T6", "ろく", "roku", igg_status="送付済み"),
            self.row("T7", "なな", "nana", content_print_status="送付不明（再送禁止）"),
            self.row("T8", "はち", "hachi_new"),                                   # 旧ハンドルで接触済み
            self.row("T9", "きゅう", "kyuu", do_not_contact="yes"),
            self.row("T10", "じゅう", "juu", notes="already queued"),
            self.row("T11", "じゅういち", "juuichi", notes="要再確認：フォロワー／登録者数の確認日が30日超または不明"),
        ])
        write(os.path.join(self.d, "contact_history.csv"),
              ["contact_id", "talent_id", "display_name", "x_handle", "campaign", "contact_at_jst"],
              [["C1", "Tzz", "", "hachi_old", "igg", "2026-07-01T10:00:00+09:00"]])
        write(os.path.join(self.d, "needs_review.csv"), ["review_id", "talent_id", "x_handle", "issue"], [])
        write(os.path.join(self.d, "identity_aliases.csv"), ["talent_id", "identifier_type", "identifier"], [
            ["T8", "x_handle", "hachi_new"], ["T8", "x_handle", "hachi_old"],
        ])

    def tearDown(self):
        shutil.rmtree(self.d)

    def classify(self, campaign):
        cfg = tq.load_config(self.d)
        ok, held, state = tq.classify(self.d, cfg, campaign, dt.date(2026, 9, 27))
        return [r["key"] for r in ok], {r["key"]: r["reasons"] for r in held}, state

    def test_igg_rules(self):
        ok, held, state = self.classify("IGGゲームイベント")
        self.assertEqual(ok, ["@ni", "@ichi", "@juuichi"])
        self.assertEqual(state["missing"], [])
        self.assertIn("送信不可", held["@san"])
        self.assertIn("条件外 fit_igg", held["@yon"])
        self.assertIn("条件外 is_individual", held["@go"])
        self.assertIn("条件外 igg_status", held["@roku"])
        self.assertIn("除外 content_print_status", held["@nana"])
        self.assertIn("IGGゲームイベントは送付済み", held["@hachi_new"])  # identity_aliases で旧ハンドルと照合
        self.assertIn("除外 do_not_contact", held["@kyuu"])
        self.assertIn("already queued", held["@juu"])

    def test_content_print_requires_fresh_audience(self):
        ok, held, _ = self.classify("コンテンツプリント")
        self.assertNotIn("@juuichi", ok)
        self.assertIn("要再確認", held["@juuichi"])
        self.assertIn("他案件で接触あり", held["@hachi_new"])

    def test_missing_rule_column_stops_real_run(self):
        write(os.path.join(self.d, "talent_master.csv"), ["talent_id", "display_name", "x_handle"],
              [["T1", "いち", "ichi"]])
        tq.main(["--master", self.d, "gap-ok", "--checked-by", "t", "--note", "n"])
        with self.assertRaises(SystemExit):
            with redirect_stdout(io.StringIO()):
                tq.main(["--master", self.d, "queue", "--campaign", "IGG"])


if __name__ == "__main__":
    unittest.main()
