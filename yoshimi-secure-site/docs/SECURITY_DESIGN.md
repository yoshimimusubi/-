# セキュリティ設計

このサイトで「何を守り、何に備えて、どう作ったか」をまとめたものです。
現行サイト（yoshimimusubi.com）は作成時の環境から中身を確認できなかったため、具体的な診断結果ではなく、
**会社サイト（特に WordPress で作られたもの）でよく起きる課題**を前提にしています。

## 考え方

1. **入口を置かない**: 管理画面・ログイン・データベース・ファイルのアップロードを公開サイトに持たない
2. **重ねて守る**: 入力チェックが漏れても CSP で止まる、CSP が緩んでもビルド時のチェックで止まる、のように何重にもする
3. **迷ったら閉じる**: 設定漏れや通信失敗のときは「通さない」側に倒す（例: Turnstile のシークレット未設定なら送信を拒否）
4. **秘密を持たない・残さない**: API キーをリポジトリに置かない。フォームの内容は保存せず、ログにも残さない
5. **部品を減らす**: 本番の npm パッケージは 2 つ。外部スクリプトはボット判定の 1 つだけ

## よくある課題と、この構成での対策

| 課題 | よくある原因 | この構成での対策 | 場所 |
|---|---|---|---|
| CMS 本体・プラグインの脆弱性を突かれる | WordPress やプラグインの更新漏れ | CMS もプラグインも動いていない。ページはビルド済みの HTML | `astro.config.mjs` |
| 管理画面の乗っ取り | パスワードの使い回し・総当たり | 公開サイトに管理画面がない。更新は GitHub（パスキー・2 段階認証）の PR 経由 | README |
| ページの改ざん・不正スクリプトの埋め込み（XSS、SEO スパム） | 入力値のエスケープ漏れ、乗っ取られたプラグイン | CSP `script-src 'none'`・Trusted Types で、HTML に何が混入しても JavaScript は動かない。内容はスキーマで検証し、リンク先は決めたドメインの https のみ | `public/_headers`、`src/content.config.ts` |
| サーバーの OS・PHP・証明書の期限切れ | 手動の保守 | サーバーを持たない（Cloudflare が管理）。証明書も自動更新 | `wrangler.jsonc` |
| フォームのスパム・大量送信 | CAPTCHA なし、回数制限なし | Turnstile（サーバー側で hostname・action まで照合）、IP ごとの回数制限、見えない入力欄（ハニーポット） | `worker/contact.ts`、`worker/turnstile.ts` |
| 他サイトからフォームを送らせる（CSRF） | トークン・Origin の確認なし | `Origin` が自サイトと一致し、`Sec-Fetch-Site: same-origin` でなければ 403 | `worker/contact.ts` |
| メールヘッダーの改ざん（Bcc の追加など） | 入力をそのままヘッダーへ | 改行・制御文字・文字の向きを変える制御文字を拒否。件名に入力を入れない。ヘッダー組み立て時にも改行があれば例外 | `worker/validate.ts`、`worker/mime.ts` |
| 想定外の項目・巨大な送信 | 検証が甘い | 知らない項目・同じ項目の重複・16KB 超・不正な UTF-8 を拒否 | `worker/validate.ts`、`worker/http.ts` |
| 問い合わせ内容（個人情報）の漏えい | DB やプラグインに保存、ログに残る | 保存しない。担当者へのメールとしてのみ届く。ログには理由コードだけを残す（テストで確認） | `worker/contact.ts`、`test/contact.test.ts` |
| 閲覧履歴が広告・解析会社に渡る | 広告タグ・外部解析・Google Fonts | Cookie・タグ・外部解析なし。フォントも自前配信 | `src/layouts/Base.astro` |
| 外部スクリプトの乗っ取り（サプライチェーン） | CDN や広告タグ経由 | 外部スクリプトはお問い合わせページの Turnstile のみ。そのページの CSP だけで許可 | `public/_headers` |
| npm パッケージの乗っ取り（インストール時に動くワームなど） | `postinstall` の実行、公開直後の版の取り込み | `ignore-scripts=true`、版の固定と lockfile、`npm ci`、Dependabot の 7 日待ち、`npm audit signatures` | `.npmrc`、`.github/dependabot.yml` |
| CI（GitHub Actions）の悪用 | 権限の付けすぎ、トークンの残留 | 権限は読み取りのみ、`persist-credentials: false`。デプロイは Cloudflare の Git 連携で行い、GitHub に API トークンを置かない | `.github/workflows/yoshimi-secure-site.yml` |
| 他サイトへの埋め込み（クリックジャッキング） | `X-Frame-Options` なし | `frame-ancestors 'none'` と `X-Frame-Options: DENY` | `public/_headers` |
| 暗号化されていない通信・格下げ攻撃 | HTTP のまま、HSTS なし | HSTS（1 年・サブドメイン込み）、`upgrade-insecure-requests` | `public/_headers` |
| WAF を迂回する別の入口 | `*.workers.dev` などの URL が生きている | `workers_dev: false`・`preview_urls: false` | `wrangler.jsonc` |
| なりすましアカウント・フィッシング | 公式アカウントがどれか分からない | 公式アカウント一覧を公開（会社概要・セキュリティのページ）、プロフィールに `rel="me"`、「DM でお金を求めない」と明記 | `src/pages/security.astro` |
| AI エージェント経由の改変（プロンプトインジェクション） | AI に公開サイトへの書き込み権限を渡している | 公開サイトに AI 用の書き込み口（MCP など）を置かない。AI の変更も PR で人が確認し、スキーマとビルドチェックを通す | README |
| 画像から位置情報・撮影機材などが漏れる | 写真の EXIF をそのまま公開 | 画像は `src/assets/` に置き、ビルド時に AVIF・WebP へ作り直す。この過程で位置情報などのメタデータは消える（GPS 入りの画像で確認済み）。外部サイトの画像の直接読み込みはビルドで止める | `src/pages/index.astro`、`scripts/verify-dist.mjs` |
| 生成 AI の画像が実在の人・現場と誤解される | 注記なしで掲載 | 生成 AI の画像には「写真はイメージです（生成 AI で作成）」と添える。医療職の姿が写る画像を実際のスタッフのように見せない | `src/pages/index.astro` |
| 脆弱性を見つけた人の連絡先がない | 窓口なし | `/.well-known/security.txt`（RFC 9116）と報告の方針を公開。期限切れはビルドで検知 | `public/.well-known/security.txt`、`scripts/verify-dist.mjs` |

## HTTP ヘッダー

静的ファイルには `public/_headers`、Worker の応答には `worker/http.ts` で付けています。`npm run preview` で実際の値を確認できます。

| ヘッダー | 値（要点） | 目的 |
|---|---|---|
| `Content-Security-Policy` | `default-src 'none'; script-src 'none'; style-src 'self'; ...; frame-ancestors 'none'` | 読み込めるものを自サイトに限り、スクリプトは一切実行させない |
| （お問い合わせのみ） | `script-src` と `frame-src` に `https://challenges.cloudflare.com` だけを追加 | Turnstile を動かすため。ほかのページには影響しない |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS 以外で接続させない |
| `X-Content-Type-Options` | `nosniff` | ファイルの種類の取り違えによる攻撃を防ぐ |
| `X-Frame-Options` | `DENY` | 古いブラウザ向けの埋め込み禁止 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 他サイトに URL の詳細を渡さない |
| `Permissions-Policy` | カメラ・位置情報・決済などをすべて無効 | 万一の不正スクリプトにも端末の機能を使わせない |
| `Cross-Origin-Opener-Policy`・`Cross-Origin-Resource-Policy` | `same-origin` | 他サイトのウィンドウやページから干渉させない |
| `Reporting-Endpoints` と CSP の `report-to` | `/api/csp-report` | CSP に違反した読み込みがあれば記録する（URL はオリジンとパスだけ） |

`style` 属性やインラインの `<style>`・`<script>` を使わないことで、`'unsafe-inline'` なしの CSP を保っています。
メンバーのイメージカラーも `/members.css` としてビルド時に書き出しています。これらはビルド時に `scripts/verify-dist.mjs` が点検します。

## お問い合わせフォームの処理の流れ

1. ブラウザ側: HTML の `required`・`maxlength`・`type="email"` で入力を案内（JavaScript なし）
2. Worker: POST 以外は 405
3. `Origin`・`Sec-Fetch-Site` が自サイトでなければ 403（CSRF 対策）
4. `Content-Type` がフォーム形式でなければ 415
5. IP ごとの回数制限（60 秒に 3 回）を超えたらエラー画面へ
6. 16KB を超える・UTF-8 として不正なら 413
7. 見えない入力欄に入力があれば、送らずに完了画面へ（ボットに気づかせない）
8. 入力チェック（項目の許可リスト、重複、文字数、改行・制御文字、メール形式、同意）
9. Turnstile をサーバー側で検証（成功・hostname・action を照合。通信失敗は失敗扱い）
10. 件名は固定の文言、返信先は検証済みのアドレスだけでメールを組み立てて送信
11. 303 で完了画面へ（再読み込みで二重送信しない）

どの段階で止まっても、ログには理由コードだけを残します。

## 公開前チェックリスト

### Cloudflare

- [ ] アカウントにパスキーまたは 2 段階認証を設定し、メンバーは必要な人だけにする
- [ ] SSL/TLS を「フル（厳密）」、「常に HTTPS を使用」をオン、最低 TLS バージョンを 1.2 以上
- [ ] DNSSEC を有効にし、レジストラ側にも DS レコードを登録
- [ ] CAA レコードで、証明書を発行できる認証局を Cloudflare が使うものに限る
- [ ] WAF のマネージドルールと Bot Fight Mode を有効化。`/api/*` にレート制限ルールを追加（Worker 側の制限と二重にする）
- [ ] Turnstile のウィジェットのホスト名を本番ドメインだけにする
- [ ] お問い合わせページを開き、ブラウザの開発者ツールで CSP の違反が出ていないか確認（Turnstile の実機確認）
- [ ] テスト送信して、通知メールの件名・本文・返信先が正しいか確認

### メール・ドメイン

- [ ] 使っているメールサービスに合わせて SPF・DKIM を設定
- [ ] DMARC を `p=none` で始め、レポートを見て問題なければ `quarantine` → `reject` へ（自社ドメインを名乗る偽メール対策）
- [ ] 余裕があれば MTA-STS・TLS-RPT も設定
- [ ] メールを送らないサブドメインには `v=spf1 -all` を設定
- [ ] レジストラのアカウントに 2 段階認証、ドメインのロック、自動更新

### GitHub

- [ ] 組織のメンバー全員に 2 段階認証（できればパスキー）を必須にする
- [ ] `main` ブランチを保護（PR 必須、CI の成功必須、強制 push 禁止）
- [ ] Secret scanning と Push protection、Dependabot alerts を有効化
- [ ] より厳しくするなら、ワークフローのアクションを commit SHA で固定する（Dependabot が SHA も更新できる）

### 移行

- [ ] 旧サイトのバックアップを取り、主要な URL を新しい URL へリダイレクト（Cloudflare の Bulk Redirects など）
- [ ] 旧サーバーを止めたら、使わなくなった DNS レコードを消す（放置するとサブドメインを乗っ取られる恐れがある）
- [ ] HSTS の `preload` は、すべてのサブドメインが HTTPS で動くことを確かめてから追加し、hstspreload.org に登録

## 公開後の運用

| 頻度 | やること |
|---|---|
| 毎週（自動） | CI が依存パッケージの脆弱性を点検。Dependabot が更新の PR を作る → 中身を見てマージ |
| 毎月 | Workers のログで `csp_violation`・`contact_rejected` の傾向を見る |
| 毎年 | `security.txt` の `Expires` を更新（期限の 60 日前からビルドで警告、切れたらビルド失敗） |
| 随時 | 公式アカウントが増えたら `src/data/site.ts` とメンバーの `links` に追加 |

## まだ確かめていないこと・制約

- **Turnstile の実機確認**: 作成した環境から Cloudflare に接続できなかったため、お問い合わせページで Turnstile が CSP の範囲内で動くことは未確認です（公開前チェックリストに入れています）
- **Turnstile は JavaScript が必要**: JavaScript を切っている人は送信できないため、代わりの連絡方法をページに書く必要があります
- **回数制限はおおよそ**: Cloudflare の Rate Limiting は拠点ごとに数えるため、厳密な上限ではありません。WAF のレート制限ルールと組み合わせてください
- **現行サイトの診断**: 現行サイトの具体的な問題（古いプラグイン、改ざんの有無など）は確認できていません。移行前に、現行サイトのバックアップとアクセスログの確認をおすすめします
