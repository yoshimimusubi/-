// 動いているテスト環境（npm run preview）に対して、ページ・セキュリティヘッダー・フォームの受付を確かめる
// 使い方: 別のターミナルで npm run preview を動かしたまま、npm run smoke [ベース URL]
const BASE = new URL(process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:8787");
const ORIGIN = BASE.origin;
const results = [];

const url = (path) => new URL(path, BASE).href;
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const get = (path, init = {}) => fetch(url(path), { redirect: "manual", ...init });

const COMMON_HEADERS = {
  "strict-transport-security": /max-age=\d+/,
  "x-content-type-options": /^nosniff$/,
  "x-frame-options": /^DENY$/,
  "referrer-policy": /strict-origin-when-cross-origin/,
  "permissions-policy": /camera=\(\)/,
  "cross-origin-opener-policy": /same-origin/,
};

try {
  await fetch(url("/"));
} catch {
  console.error(`✗ ${ORIGIN} に接続できません。先に別のターミナルで npm run preview を起動してください`);
  process.exit(1);
}

// 1. サイトマップにあるすべてのページ
const sitemap = await (await get("/sitemap.xml")).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
check("サイトマップにページがある", pages.length >= 10, `${pages.length} ページ`);

for (const path of pages) {
  const res = await get(path);
  const csp = res.headers.get("content-security-policy") ?? "";
  const missing = Object.entries(COMMON_HEADERS)
    .filter(([name, pattern]) => !pattern.test(res.headers.get(name) ?? ""))
    .map(([name]) => name);
  const cspOk =
    path === "/contact/"
      ? csp.includes("script-src https://challenges.cloudflare.com") && !csp.includes("'unsafe-inline'")
      : csp.includes("script-src 'none'") && csp.includes("frame-ancestors 'none'");
  check(`${path} が表示できる`, res.status === 200, `status ${res.status}`);
  check(`${path} のセキュリティヘッダー`, cspOk && missing.length === 0, missing.length ? `不足: ${missing.join(", ")}` : cspOk ? "" : `CSP: ${csp}`);
}

// 2. 自動生成ファイル・キャッシュ
for (const path of ["/robots.txt", "/news/rss.xml", "/llms.txt", "/members.css", "/.well-known/security.txt", "/og.png"]) {
  const res = await get(path);
  check(`${path} がある`, res.status === 200, `status ${res.status}`);
}
const home = await (await get("/")).text();
const css = home.match(/href="(\/_astro\/[^"]+\.css)"/)?.[1];
if (css) {
  const res = await get(css);
  check("CSS を長期キャッシュする", /immutable/.test(res.headers.get("cache-control") ?? ""), res.headers.get("cache-control") ?? "");
} else {
  check("CSS を長期キャッシュする", false, "トップページに /_astro/*.css が見つからない");
}

// 3. 存在しないページ・URL の正規化
{
  const res = await get("/no-such-page/");
  check("存在しないページは 404", res.status === 404 && (res.headers.get("content-security-policy") ?? "").length > 0, `status ${res.status}`);
  const redirect = await get("/company");
  check("末尾の / を補う", [301, 307, 308].includes(redirect.status) && redirect.headers.get("location")?.endsWith("/company/"), `status ${redirect.status}`);
}

// 4. お問い合わせの受け口（送信回数の上限を使い切らないよう、POST は 1 回だけ）
{
  const res = await get("/api/contact");
  check("受け口は POST 以外を拒否（405）", res.status === 405 && res.headers.get("allow") === "POST", `status ${res.status}`);
  check("受け口の応答はキャッシュさせない", res.headers.get("cache-control") === "no-store");

  const form = { "Content-Type": "application/x-www-form-urlencoded" };
  const cross = await get("/api/contact", { method: "POST", headers: { ...form, Origin: "https://evil.example" }, body: "name=a" });
  check("他サイトからの送信を拒否（403）", cross.status === 403, `status ${cross.status}`);

  const json = await get("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "Sec-Fetch-Site": "same-origin" },
    body: "{}",
  });
  check("フォーム以外の形式を拒否（415）", json.status === 415, json.status === 403 ? "403: .dev.vars の SITE_ORIGIN とアクセスしている URL が一致しているか確認" : `status ${json.status}`);

  const invalid = await get("/api/contact", {
    method: "POST",
    headers: { ...form, Origin: ORIGIN, "Sec-Fetch-Site": "same-origin" },
    body: new URLSearchParams({ category: "work", name: "テスト", email: "not-an-email", message: "スモークテストの送信です。", consent: "yes" }).toString(),
  });
  check(
    "入力エラーはエラー画面へ（303）",
    invalid.status === 303 && invalid.headers.get("location") === "/contact/error/invalid/",
    `status ${invalid.status} → ${invalid.headers.get("location") ?? ""}`,
  );

  const report = await get("/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/reports+json" },
    body: JSON.stringify([{ type: "csp-violation", body: { effectiveDirective: "script-src-elem", blockedURL: "https://example.com/x.js", documentURL: url("/") } }]),
  });
  check("CSP 違反の報告を受け取る（204）", report.status === 204, `status ${report.status}`);
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail && !r.ok ? `（${r.detail}）` : ""}`);
console.log(`\n${results.length - failed.length} / ${results.length} 件 OK（${ORIGIN}）`);
process.exit(failed.length === 0 ? 0 : 1);
