# EmDash でヨシミムスビ公式サイトを公開する手順とプロンプト

きっかけ: イケハヤ氏の note「WordPress is dead. Cloudflare の EmDash に乗り換えるべき理由」（2026-10-20）と、
KEITO【AI&WEB ch】の解説動画（2026-10-18）の文字起こし。

**2026-10-27 更新**: ヨシミムスビ公式サイトのリニューアル版を、このリポジトリの `yoshimi-site/` にクラウドで作成済み。
残りは「PC で動かして確認 → Cloudflare に公開」で、これは Cloudflare にログインできる PC で行う。

- サイトの説明: `yoshimi-site/README.md`
- 元資料をどう取り入れたか: `yoshimi-site/docs/EMDASH_MAPPING.md`
- 公開前に差し替える項目: `yoshimi-site/docs/REPLACE_CHECKLIST.md`
- AI での更新手順: `yoshimi-site/docs/AI_OPERATIONS.md`
- デザインの確認: `yoshimi-site/docs/preview/screenshots/`

## EmDash の要点

- Cloudflare が作っている CMS。Astro（TypeScript）製で、PHP も別サーバーも不要
- Cloudflare の Workers（サーバー）・D1（データベース）・R2（画像などの保存先）の上で動く
- 管理画面は `https://<サイト>/_emdash/admin`。ログインは**パスキー**（指紋・顔認証など）が基本
- AI 用の窓口（MCP）が `https://<サイト>/_emdash/api/mcp` に最初から付いている。Claude Code や Claude アプリのコネクタからつなぐ

## 0. 事前に決めること・やること（本人・15分）

1. **独自ドメインを使うか**: 最初は無料の `yoshimi-site.<アカウント>.workers.dev` で公開できる。
   独自ドメインを使う場合は、そのドメインを Cloudflare に移す（DNS を Cloudflare 管理にする）必要がある
2. **Cloudflare アカウントを作る**: https://dash.cloudflare.com/sign-up で作成し、**2 段階認証を有効にする**。
   パスワードは台帳・チャット・リポジトリに書かない
3. PC に **Node.js 22 系の最新版（22.12 以上）** を入れる（`node --version` で確認）
4. `yoshimi-site/docs/REPLACE_CHECKLIST.md` の「必ず差し替える」項目の正しい内容を手元に用意する（公開後に AI に頼んで直せる）

## 1. PC の Claude Code に渡すプロンプト

このリポジトリ（`yoshimimusubi/-`）を PC に clone したフォルダで `claude` を起動し、下のプロンプトの `< >` を書き換えて貼り付ける。

```
ヨシミムスビ公式サイトのリニューアル版（EmDash）を PC で動かして確認し、Cloudflare に公開するところまで進めてください。
台帳の T-20261025-01 の作業です。サイトは claude/emdash-new-site ブランチの yoshimi-site/ にあります。
まず `git fetch origin claude/emdash-new-site` してそのブランチに切り替え、T-20261025-01 を doing（実行場所 PC）にして commit & push してください。

## 決めたこと
- 独自ドメイン: <使わない（workers.dev で公開） / 使う: example.com>
- Cloudflare アカウント: 作成済み
- サイトを別リポジトリに分けるか: <分ける（yoshimimusubi/yoshimi-site を非公開で作る） / このリポジトリのまま>

## 進め方
変更を加える前に、OS・Node.js のバージョン・git の状態を確認し、やることの計画を見せて承認を取ってください。
コマンドの実行やアカウントにかかわる操作の前には、何をするかを説明してください。

1. yoshimi-site/README.md・docs/EMDASH_MAPPING.md・AGENTS.md を読む
   （このサイトはクラウドで作ったが、dev サーバーを一度も起動していない。動作確認はこれが初めて）
2. `cd yoshimi-site && npm install && npm run dev` で起動し、エラーが出たら直す
   - 起動時に emdash-env.d.ts（型定義）が自動で作り直される。差分が出たら内容を確認して commit する
   - `npm run typecheck` が通ることも確認する
3. http://localhost:4321/ と /talents、/talents/kocho-kurono、/news、/company、/contact、/ai-native、/llms.txt、/rss.xml を開いて表示を確認する。
   デザインは yoshimi-site/docs/preview/screenshots/ のスクリーンショットと見比べる
4. http://localhost:4321/_emdash/admin で管理画面の初期設定（管理者・パスキー）を私が行うので、案内して待つ。
   メンバー・お知らせ・固定ページが入っていること、管理画面が日本語で表示されることを確認する
5. 別リポジトリに分ける場合は、yoshimi-site/ の中身で非公開リポジトリを作って push する（作成前に私の承認を取る）
6. Cloudflare へ公開
   - `npx wrangler login`（ブラウザで私がログインする。API トークンを作らせたり貼らせたりしない）
   - `npm run deploy`（初回で D1 データベースと R2 バケットが自動で作られる）
   - 独自ドメインを使う場合は、公開前に wrangler.jsonc の EMDASH_SITE_URL と routes を相談する
     （パスキーは初期設定したアドレスでしか使えないため、本番の初期設定は最終的なアドレスで行う）
7. 公開したアドレスで管理画面の初期設定を私が行う。パスキーは PC とスマホの 2 台で登録するよう案内する
8. `npx emdash doctor` と `npx wrangler tail` で、予約投稿用の定期実行（Cron）が動いているか確認する
9. docs/AI_OPERATIONS.md の手順で、Claude Code（`claude mcp add`）とスマホの Claude アプリ（カスタムコネクタ）を
   公開したサイトの MCP につなぎ、テストのお知らせを下書きで 1 本作って削除する

## 完了条件
- 公開アドレスでトップページと管理画面が開き、テスト記事を 1 本公開・削除できる
- スマホのブラウザから管理画面にパスキーでログインできる
- スマホの Claude アプリから、MCP 経由でお知らせの下書きを作れる
- 台帳の T-20261025-01 の「次の一手」に公開アドレスと残作業（REPLACE_CHECKLIST の未対応分）を書き、waiting か done にして commit & push
  （パスワード・トークン・暗号化キーは台帳に書かない）
```

## 2. 無料で始めるときの注意

- **費用**: Workers・D1・R2 にはそれぞれ無料枠があり、小規模サイトなら無料で始められる見込み。
  上限や料金は変わるので、契約前に Cloudflare の公式料金ページで確認する
- **有料になる場面**: サンドボックス型プラグイン（Workers Paid、月 $5〜）、無料枠を超えたアクセス・保存量、
  画像の変換が月 5,000 件を超えたとき（超えると新しいサイズの画像が表示されなくなる）
- **ログイン**: 本番にはメール送信機能がないため、マジックリンクは別途設定するまで使えない。
  パスキーを複数の端末で登録しておく
- **プラグイン**: WordPress のプラグインはそのままは使えない。このサイトは公式のフォームプラグインだけを入れている

## 3. 動作確認チェックリスト

- [ ] `https://yoshimi-site.<アカウント>.workers.dev`（または独自ドメイン）でトップページが表示される
- [ ] PC とスマホの両方から管理画面にパスキーでログインできる
- [ ] 記事を予約投稿すると、指定時刻に公開される（Cron の反映には最大 15 分かかる）
- [ ] `/llms.txt` にメンバーとお知らせが並ぶ
- [ ] スマホの Claude アプリからお知らせの下書きを作れる
- [ ] `.env` が GitHub に上がっていない（`git log --all -- .env` が空）
