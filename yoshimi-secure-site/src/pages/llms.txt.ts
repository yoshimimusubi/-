import type { APIRoute } from "astro";
import { SITE } from "../data/site";
import { getMembers, getNews } from "../lib/content";

// AI 向けのサイト要約（llms.txt）。中身はビルド時にコンテンツから作る
export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const members = await getMembers();
  const news = (await getNews()).slice(0, 10);
  const text = [
    `# ${SITE.legalName}`,
    "",
    `> ${SITE.description}`,
    "",
    "## メンバー（あっぷるぐみ）",
    ...members.map((m) => `- [${m.data.name}](${url(`/members/${m.id}/`)}): ${m.data.summary}`),
    "",
    "## お知らせ",
    ...news.map((n) => `- [${n.data.title}](${url(`/news/${n.id}/`)}): ${n.data.excerpt}`),
    "",
    "## そのほか",
    `- [会社概要](${url("/company/")})`,
    `- [お問い合わせ](${url("/contact/")})`,
    `- [セキュリティへの取り組み・公式アカウント一覧](${url("/security/")})`,
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
