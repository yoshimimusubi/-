// ビルド結果（dist/）を公開前に点検する。CSP を破る書き方や、SEO・アクセシビリティの抜けがあれば失敗させる
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Windows でも動くよう、URL からパスへの変換は fileURLToPath を使い、相対パスの区切りは / にそろえる
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const relPath = (file) => relative(DIST, file).split(sep).join("/");
const ALLOWED_EXTERNAL_SCRIPTS = { "contact/index.html": ["https://challenges.cloudflare.com/turnstile/v0/api.js"] };
const problems = [];
const warn = [];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const htmlFiles = [];
for await (const file of walk(DIST)) if (file.endsWith(".html")) htmlFiles.push(file);
if (htmlFiles.length === 0) problems.push("dist に HTML がありません");

for (const file of htmlFiles) {
  const rel = relPath(file);
  const html = await readFile(file, "utf8");
  const fail = (msg) => problems.push(`${rel}: ${msg}`);

  if (!/<html lang="ja"/.test(html)) fail('<html lang="ja"> がない');
  if (!/<title>[^<]+<\/title>/.test(html)) fail("<title> がない");
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail("meta description がない");
  if (!/<link rel="canonical" href="https:\/\//.test(html)) fail("canonical がない");
  const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1 !== 1) fail(`<h1> が ${h1} 個（1 個にする）`);

  // CSP（script-src 'none' / style-src 'self'）を破る書き方
  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/g)) {
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    const src = attrs.match(/src="([^"]+)"/)?.[1];
    if (!src || !(ALLOWED_EXTERNAL_SCRIPTS[rel] ?? []).includes(src)) fail(`許可していない <script ${attrs.trim()}>`);
  }
  if (/<style[\s>]/.test(html)) fail("インラインの <style> がある");
  if (/\sstyle="/.test(html)) fail("style 属性がある");
  if (/\son[a-z]+="/i.test(html)) fail("onclick などのイベント属性がある");
  if (/(href|src|action)="\s*javascript:/i.test(html)) fail("javascript: の URL がある");
  for (const [, url] of html.matchAll(/(?:href|src|action)="(http:\/\/[^"]+)"/g)) fail(`http の URL: ${url}`);
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(tag)) fail(`target="_blank" に rel="noopener" がない: ${tag}`);
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(tag)) fail(`alt のない <img>: ${tag}`);
    // 幅と高さがないと、読み込み時にレイアウトがずれる（CLS）
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) fail(`width・height のない <img>: ${tag}`);
    if (/\ssrc="https?:\/\//.test(tag)) fail(`外部サイトの画像を直接読み込んでいる: ${tag}`);
  }
}

// CSS に data: のフォントや外部 URL が埋め込まれていないか（CSP の font-src / img-src で止まる）
for await (const file of walk(DIST)) {
  if (!file.endsWith(".css")) continue;
  const css = await readFile(file, "utf8");
  const rel = relPath(file);
  if (/url\(\s*["']?data:font/.test(css)) problems.push(`${rel}: data: のフォントが埋め込まれている`);
  for (const [, url] of css.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/g)) problems.push(`${rel}: 外部 URL を読み込んでいる: ${url}`);
}

// セキュリティヘッダー
const headers = await readFile(join(DIST, "_headers"), "utf8").catch(() => "");
for (const needle of [
  "Strict-Transport-Security:",
  "script-src 'none'",
  "frame-ancestors 'none'",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy:",
  "Permissions-Policy:",
]) {
  if (!headers.includes(needle)) problems.push(`_headers に ${needle} がない`);
}

// security.txt の期限
const securityTxt = await readFile(join(DIST, ".well-known/security.txt"), "utf8").catch(() => "");
const expires = securityTxt.match(/^Expires: (.+)$/m)?.[1];
if (!expires) problems.push("security.txt に Expires がない");
else {
  const days = Math.floor((Date.parse(expires) - Date.now()) / 86_400_000);
  if (Number.isNaN(days) || days < 0) problems.push(`security.txt の期限が切れている（${expires}）`);
  else if (days < 60) warn.push(`security.txt の期限まで残り ${days} 日。更新してください`);
}

for (const w of warn) console.warn(`⚠ ${w}`);
if (problems.length > 0) {
  console.error(`✗ 公開前チェックで ${problems.length} 件の問題:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ 公開前チェック OK（HTML ${htmlFiles.length} ファイル）`);
