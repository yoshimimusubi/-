import type { APIRoute } from "astro";
import { getMembers, getNews } from "../lib/content";
import { isoDate } from "../lib/format";

const STATIC_PATHS = ["/", "/members/", "/news/", "/company/", "/contact/", "/security/", "/privacy/"];

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const entries = [
    ...STATIC_PATHS.map((path) => ({ loc: url(path) })),
    ...(await getMembers()).map((m) => ({ loc: url(`/members/${m.id}/`) })),
    ...(await getNews()).map((n) => ({ loc: url(`/news/${n.id}/`), lastmod: isoDate(n.data.date) })),
  ];
  const body = entries
    .map((e) => `  <url><loc>${escapeXml(e.loc)}</loc>${"lastmod" in e ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
