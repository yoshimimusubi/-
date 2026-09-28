# リサーチ用プロンプト（Mac の Claude / Codex に貼る）

スキル `talent-contact-research`（`.claude/skills/talent-contact-research/`）を入れてある環境なら、
「タレントのリサーチを100名分進めて」だけで動く。スキルが無い環境では下の枠内をそのまま貼る。

---

```
タレント台帳の保留者を、公開プロフィールで1人ずつ調べて記録してください。目的は「送れる根拠があるか」の確認です。
今回は何も送りません。

■ 準備
- リポジトリ: ~/dm-ops/tools（無ければ git clone -b claude/codex-chat-task-handoff-ntokd5 https://github.com/yoshimimusubi/-.git ~/dm-ops/tools）
- 手順と記入基準: ~/dm-ops/tools/.claude/skills/talent-contact-research/SKILL.md と references/fields.md を最初に読む
- 作業フォルダ: ~/dm-ops/talent-master-20260927-canonical（台帳 CSV と config.json がある場所）
- ブラウザ: X に送信元アカウントでログイン済みの Chrome（IGG は @kocho_kurono、コンテンツプリントは @ukamoto_marino）

■ やること
1. 対象リストを作る
   cd ~/dm-ops/talent-master-20260927-canonical
   python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . research-list --campaign all --include-sendable --limit 100
2. out/research_targets_全案件_<今日>.csv の上から順に、1人ずつ次を確認する
   - アカウントの状態（存在／凍結／削除／鍵／見つからない）
   - 最新投稿日と活動状況（30日以内の投稿で活動中）
   - 個人勢か（事務所・企業所属の記載があれば個人ではない。事務所名も記録）、日本語で活動しているか
   - DM開放：プロフィールに「メッセージ」ボタンがあるか（見るだけ・押さない）。開いていなければ dm_open=no と明記し、確認に使ったアカウントも書く
   - お仕事依頼の受付方針：プロフィール・固定投稿・lit.link 等・YouTube 概要欄の記載から DM可／メール可／フォーム可／依頼お断り／記載なし を判定し、根拠の文言をそのまま残す
   - 直接のメールアドレス：本人か所属事務所が公式に公開しているビジネス用アドレスがあるか。あれば、そのアドレスと載っていたページのURL
   - 問い合わせフォームのURL、フォロワー数、YouTube 登録者数
3. 1人調べるごとに research_results.csv に1行追記する（列と記入値は references/fields.md のとおり）
4. 100名終わったら、または途中で止まったら、送付キューに反映されたかを確認する
   python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . queue --campaign IGG --dry-run
   python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . queue --campaign プリント --dry-run
5. 報告：調べた人数、受付方針別の人数、DM開放 yes/no の人数、メールが見つかった人数、
   アカウントが存在しなかった人数、送付可が何名増えたか

■ 守ること
- DM作成画面を開かない。フォロー・いいね・リポスト・返信をしない。「メッセージ」ボタンはクリックしない
- メールアドレスを推測で作らない。検索スニペット・まとめサイト・第三者のデータベースは使わない
- イラスト・ボイス依頼専用、切り抜き報告用、質問箱は業務窓口として扱わない（notes にだけ書く）
- DMが開いているだけでは「DM可」にしない。依頼を受け付ける記載があるときだけ
- YouTube の「メールアドレスを表示」の CAPTCHA は解かない。notes に「YouTubeビジネスメールあり（手動表示が必要）」と書く
- 1人ごとに20〜60秒あける。X に制限・警告・再ログイン要求が出たら止めて報告する
- 台帳・接触履歴・要確認の CSV は書き換えない。触るのは research_results.csv への追記と out/ の中だけ
- ログイン中のアカウントを切り替えない
```

---

## 対象人数の目安（旧 3,405行版での値。正本 4,700行版では未計測）

| research-list | 人数 |
|---|---:|
| `--campaign all --include-sendable`（両案件・送付可の人のメール確認も含む） | 1,747 |
| `--campaign all`（保留の解消だけ） | 1,512 |
| `--campaign IGG --include-sendable` | 929 |
| `--campaign プリント --include-sendable` | 1,199 |

100名/回なら全体で約18回。優先度A → B の順に出るので、上から進めれば効果の大きい人から片付く。
