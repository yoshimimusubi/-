import type { APIRoute } from "astro";
import { SITE } from "../../data/site";
import { getNews } from "../../lib/content";

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const GET: APIRoute = async ({ site }) => {
  const items = (await getNews())
    .map((n) => {
      const link = new URL(`/news/${n.id}/`, site).href;
      return [
        "    <item>",
        `      <title>${escapeXml(n.data.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${n.data.date.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(n.data.excerpt)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${SITE.name} お知らせ`)}</title>
    <link>${escapeXml(new URL("/news/", site).href)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>ja</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
