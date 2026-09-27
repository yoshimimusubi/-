# タレントDM送付 運用手順（talent-master 版）

`~/dm-ops/talent-master/` の6ファイルを「送ってよい相手だけを毎日少しずつ抜き出す」ための手順。
送信操作は必ず人が確認してから行う。ツールはキューを作るだけで、X・YouTube には一切アクセスしない。

## 全体の流れ

```
0. 初回だけ   列の対応づけ（inspect → config.json）
1. 初回だけ   7/11以降の空白期間を確認 → 接触履歴に反映 → gap-ok
2. 毎回       queue で本日分キューを作る（保留リストも同時に出る）
3. 毎回       キューを人が目視 → 1件ずつ送信
4. 毎回       送った直後に record（sent / failed / unknown）
5. 随時       保留リスト・要確認を人が解消 → 要確認ファイルの対応状況を「解消」に
```

## 0. 初回セットアップ（Mac のターミナル）

```bash
cd ~/dm-ops
git clone -b claude/talent-list-execution-9q6tav https://github.com/yoshimimusubi/-.git tools   # 取得済みなら git pull
cp tools/dm-ops/config.example.json talent-master/config.json
python3 tools/dm-ops/talent_queue.py inspect
```

`inspect` は6ファイルの行数・列名と、どの列を「ID／名前／X／YouTube／案件／日時」として読んだかを表示する。
- 役割が割り当たっていない列があれば `talent-master/config.json` の `columns` に実際の列名を足す。
- ファイルが見つからない場合は `files` のパターンを実ファイル名にする。
- `campaign_aliases` の `A` / `B` を実際の案件名に変える（例: `"A": ["〇〇キャンペーン"]`）。
  **ここを直さないと「その案件は送付済み」の判定が効かない。** 接触履歴の「案件」列に入っている表記をそのまま書く。

xlsx の場合は `pip3 install openpyxl` か、CSV に書き出してから使う。

## 1. 空白期間の確認（最重要・送信前に必須）

CSV送信ログは **2026-07-11 より新しいものが見つかっていない**。一方で、その後もX運用は続いていたので、
7/11以降に送ったDMが接触履歴に入っていない可能性がある。ここを埋めずに送ると二重送付になる。

1. X（各アカウント）と YouTube の送信済みメッセージを 2026-07-11 以降でさかのぼる
2. 見つかった送付を `接触履歴` に追記する（元ファイルを直接いじりたくなければ、`record` で1件ずつ入れてもよい）
   ```bash
   python3 tools/dm-ops/talent_queue.py record --campaign A --key @handle --result sent --note "7/11以降 送信済みBOXで確認"
   ```
   送ったかどうか確信が持てない相手は `--result unknown`（以後、全案件で再送禁止になる）
3. 確認が終わったら記録を残す
   ```bash
   python3 tools/dm-ops/talent_queue.py gap-ok --checked-by 名前 --note "7/11〜9/27 X3アカウント・YouTube確認、追記12件"
   ```

`gap-ok` するまで `queue` は `--dry-run`（ファイル名に `DRYRUN_` が付く＝送信禁止版）でしか動かない。

## 2. 本日分のキューを作る

```bash
python3 tools/dm-ops/talent_queue.py queue --campaign A            # 上限は config の daily_cap（初期20）
python3 tools/dm-ops/talent_queue.py queue --campaign A --cap 10   # 上限を変える
```

出力（`talent-master/out/`）:
- `queue_A_YYYY-MM-DD.csv` … 本日送ってよい相手（上限件数まで）
- `held_A_YYYY-MM-DD.csv` … 送らない相手と理由

キューに入る条件は「以下のどれにも当たらない」こと。ID・Xハンドル・YouTube・名前のどれか1つでも一致すれば除外（安全側）。

| 保留理由 | 意味 |
|---|---|
| 送付不明・再送禁止 | 再送禁止リスト、または record で unknown にした相手 |
| 要確認 | 要確認リストに載っていて、対応状況が「解消／確認済」でない |
| 両案件の送付証跡あり | もう送る案件がない |
| ○案件は送付済み | 接触履歴 or 送信ログに同じ案件の送付がある |
| 案件不明の接触あり | 接触履歴にあるが案件列が空 → 人が確認 |
| 直近30日以内に接触 | 別案件でも間隔をあける（`cooldown_days`） |
| 識別子不足 | X / YouTube / ID がどれも無い |
| 同名あり・識別子で区別不可 | 同じ名前の行があり、片方に識別子が無い |
| 台帳内の重複行 | 同じ相手が台帳に2行以上ある（2行目以降を保留） |

照合用ファイル（再送禁止・要確認・両案件・接触履歴）が1つでも見つからないと、本番の queue は止まる。

## 3〜4. 送信と記録

- キューCSVを上から1件ずつ、**相手のプロフィールを開いて本人・活動中であることを確認してから**手動で送る。
- 送った直後に1件ずつ記録する（まとめて後で、にしない）:
  ```bash
  python3 tools/dm-ops/talent_queue.py record --campaign A --key @aoi_ch --result sent
  python3 tools/dm-ops/talent_queue.py record --campaign A --key @xxx --result failed --note "DM閉鎖"
  python3 tools/dm-ops/talent_queue.py record --campaign A --key @yyy --result unknown --note "送信ボタン後にエラー"
  ```
- 記録は `out/send_log.csv` に追記され、次回の queue から自動で除外に使われる。
  - `sent` … その案件は以後除外、他案件も cooldown 期間は除外
  - `failed` … 送れていない。次回また候補に戻る
  - `unknown` … 送れたか不明。**全案件で再送禁止**

## Claude（Mac上のエージェント）に任せる場合のルール

- やってよい: `inspect` / `queue` / `record`（人が「送った」と言った分の記録）/ 保留リストの整理・要確認の下調べ案
- やらない: X・YouTube の送信操作、`gap-ok` の自己判断での実行、元ファイル（6ファイル）の上書き、定期実行設定の変更
- 送信は「キューを見せる → 人がOK → 人が送る → 送った分を record」の順番を崩さない

## 数字の見方（現時点）

- 台帳 2,969行のうち、要確認 1,251件／700名分は最初から保留に入る。実際に送付可になるのは台帳から
  「要確認・再送禁止(1名)・両案件済み(10名)・案件ごとの送付済み・識別子不足・同名」を引いた残り。
  初回 `queue --dry-run` の出力で実数を確認する。
- 要確認を解消すると送付可が増える。解消は要確認ファイルの「対応状況」列を `解消` にするだけでよい
  （どの値を解消扱いにするかは `review_resolved_values`）。

## テスト

```bash
python3 -m unittest tools/dm-ops/test_talent_queue.py
```
架空データで、除外ルール・空白期間ゲート・送信記録・元ファイル非変更を確認する。
