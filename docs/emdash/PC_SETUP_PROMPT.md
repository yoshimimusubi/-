# EmDash で新しいサイトを立ち上げる手順とプロンプト

きっかけ: イケハヤ氏の note「WordPress is dead. Cloudflare の EmDash に乗り換えるべき理由」（2026-10-20）。
記事は WordPress からの移行が主題だが、ここでは **WordPress を使わず EmDash で新規サイトを作る**。

クラウドセッションからは Cloudflare に接続できないため、**作成・デプロイは PC の Claude Code で行う**。
この文書は 2026-10-25 時点の公式パッケージ（`create-emdash` 1.3.1）と公式ドキュメントをもとに書いている。

## EmDash の要点

- Cloudflare が作っている CMS。Astro（TypeScript）製で、PHP も別サーバーも不要
- Cloudflare の Workers（サーバー）・D1（データベース）・R2（画像などの保存先）の上で動く
- 管理画面は `https://<サイト>/_emdash/admin`。ログインは**パスキー**（指紋・顔認証など）が基本
- 雛形（テンプレート）は 4 種類
  - `blog`: ブログ（カテゴリ・タグ・検索・RSS）
  - `marketing`: ランディングページ（ヒーロー画像・特徴・料金・FAQ）
  - `portfolio`: 作品・実績の一覧（タグで絞り込み・個別ページ）
  - `starter`: 投稿と固定ページだけの汎用
- Claude Code 用の公式スキルと、Claude から直接サイトを操作できる MCP サーバーが付いている

## 0. 事前に決めること・やること（本人・15分）

1. **サイトの用途と雛形**: 上の 4 種類から選ぶ（例: タレント紹介なら `portfolio`、告知・会社案内なら `marketing`）
2. **サイト名（英小文字とハイフン）**: フォルダ名・GitHub リポジトリ名・Cloudflare 上の名前に使う（例: `yoshimi-site`）
3. **独自ドメインを使うか**: 最初は無料の `<名前>.<アカウント>.workers.dev` で公開できる。
   独自ドメインを使う場合は、そのドメインを Cloudflare に移す（DNS を Cloudflare 管理にする）必要がある
4. **Cloudflare アカウントを作る**: https://dash.cloudflare.com/sign-up で作成し、**2 段階認証を有効にする**。
   パスワードは台帳・チャット・リポジトリに書かない
5. PC に **Node.js 22 系の最新版（22.23.4 以上）** を入れる（`node --version` で確認）

## 1. PC の Claude Code に渡すプロンプト

このリポジトリ（`yoshimimusubi/-`）を PC に clone したフォルダで `claude` を起動する。
最初に EmDash 公式の Claude Code 用スキルを入れる（1 行ずつ入力）:

```
/plugin marketplace add emdash-cms/skills
/plugin install emdash@emdash
```

続けて、下のプロンプトの `< >` の部分を書き換えてから貼り付ける。

```
EmDash（Cloudflare 製の CMS）で新しいサイトを作り、Cloudflare に公開するところまで進めてください。
台帳の T-20261025-01 の作業です。台帳の行と手順書（docs/emdash/PC_SETUP_PROMPT.md）は
claude/emdash-new-site ブランチにあるので、まず `git fetch origin claude/emdash-new-site` してそのブランチに切り替え、
T-20261025-01 を doing（実行場所 PC）にして commit & push してください。

## 決めたこと
- 用途: <例: タレント紹介サイト>
- 雛形: <blog / marketing / portfolio / starter>
- サイト名: <例: yoshimi-site>
- 独自ドメイン: <使わない（workers.dev で公開） / 使う: example.com>
- Cloudflare アカウント: 作成済み

## 進め方
変更を加える前に、OS・Node.js のバージョン・git の状態を確認し、やることの計画を見せて承認を取ってください。
コマンドの実行やアカウントにかかわる操作の前には、何をするかを説明してください。

1. サイトはこのリポジトリに入れず、親フォルダに <サイト名> フォルダを作って別リポジトリにする
   `npm create emdash@latest <サイト名> -- --template cloudflare:<雛形> --pm npm`
   - 「sandboxed plugins」は有料プラン専用なので無効のまま（既定）
2. EmDash 公式スキル（emdash:building-emdash-site）が使えることを確認し、以降の作業はその内容に従う
   （使えなければ、私が入力すべき /plugin コマンドを教えて止まる）
3. ローカルで起動して確認: `npm run dev` → http://localhost:4321/ と http://localhost:4321/_emdash/admin
   ローカルの初期設定（サイト名・メール・パスキー）は私が画面で行うので、案内して待つ
4. `.env` の EMDASH_ENCRYPTION_KEY は commit しない。パスワード管理ツールに保管するよう私に伝える
5. GitHub に非公開リポジトリ yoshimimusubi/<サイト名> を作って push する（作成前に私の承認を取る）
6. Cloudflare へ公開
   - `npx wrangler login`（ブラウザで私がログインする。API トークンを作らせたり貼らせたりしない）
   - `npm run deploy`（初回で D1 データベースと R2 バケットが自動で作られる）
   - 独自ドメインを使う場合は、公開前に EMDASH_SITE_URL の設定と wrangler.jsonc の routes を相談する
     （パスキーは初期設定したアドレスでしか使えないため、本番の初期設定は最終的なアドレスで行う）
7. 公開したアドレスで管理画面の初期設定を私が行う。パスキーは PC とスマホの 2 台で登録するよう案内する
   （メール送信が未設定だとマジックリンクでログインできず、パスキーを失うと入れなくなるため）
8. `npx emdash doctor` と `npx wrangler tail` で、予約投稿用の定期実行（Cron）が動いているか確認する

## 完了条件
- 公開アドレスでトップページと管理画面が開き、テスト記事を 1 本公開・削除できる
- スマホのブラウザから管理画面にパスキーでログインできる
- 台帳の T-20261025-01 の「次の一手」に公開アドレスと残作業を書き、waiting か done にして commit & push
  （パスワード・トークン・暗号化キーは台帳に書かない）
- 最後に「スマホから記事を書くときの手順」を箇条書きで出す
```

## 2. 無料で始めるときの注意

- **費用**: Workers・D1・R2 にはそれぞれ無料枠があり、小規模サイトなら無料で始められる見込み。
  上限や料金は変わるので、契約前に Cloudflare の公式料金ページで確認する
- **有料になる場面**: サンドボックス型プラグイン（Workers Paid、月 $5〜）、無料枠を超えたアクセス・保存量、
  画像の変換が月 5,000 件を超えたとき（超えると新しいサイズの画像が表示されなくなる）
- **ログイン**: 本番にはメール送信機能がないため、マジックリンクは別途設定するまで使えない。
  パスキーを複数の端末で登録しておく
- **プラグイン**: WordPress のプラグインはそのままは使えない。必要な機能は公式プラグインか、作って追加する

## 3. 動作確認チェックリスト

- [ ] `https://<サイト名>.<アカウント>.workers.dev`（または独自ドメイン）でトップページが表示される
- [ ] PC とスマホの両方から管理画面にパスキーでログインできる
- [ ] 記事を予約投稿すると、指定時刻に公開される（Cron の反映には最大 15 分かかる）
- [ ] `.env` が GitHub に上がっていない（`git log --all -- .env` が空）
