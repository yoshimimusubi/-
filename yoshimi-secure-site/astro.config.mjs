// @ts-check
import { defineConfig, envField } from "astro/config";

// すべてのページをビルド時に HTML として書き出す（サーバー側でページを組み立てない）。
// 動く部分はお問い合わせの受け口だけで、worker/ に分けてある。
export default defineConfig({
  site: "https://yoshimimusubi.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
    // CSS をすべて外部ファイルにする。インラインの <style> を出さないことで
    // Content-Security-Policy を style-src 'self' のまま運用できる
    inlineStylesheets: "never",
  },
  vite: {
    build: {
      // 小さなファイルを data: URI として CSS に埋め込まない（CSP の font-src 'self' で止まるため）
      assetsInlineLimit: 0,
    },
  },
  // 画面遷移の先読みなど、クライアント側の JavaScript を足す機能は使わない
  prefetch: false,
  devToolbar: { enabled: false },
  env: {
    schema: {
      // Turnstile のサイトキーは公開前提の値。未設定なら Cloudflare のテスト用キー（常に成功）を使う
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
        default: "1x00000000000000000000AA",
      }),
    },
  },
});
