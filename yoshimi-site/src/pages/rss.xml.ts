import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";
import { escapeXml } from "../utils/text";

export const GET: APIRoute = async ({ site, url }) => {
	const siteUrl = (site?.toString() || url.origin).replace(/\/$/, "");
	const settings = await getSiteSettings();
	const siteTitle = settings?.title || "ヨシミムスビ";
	const siteDescription = settings?.tagline || "";

	const { entries: posts } = await getEmDashCollection("news", {
		orderBy: { published_at: "desc" },
		limit: 30,
	});

	const items = posts
		.map((post) => {
			if (!post.data.publishedAt) return null;
			const link = `${siteUrl}/news/${post.id}`;
			return `    <item>
      <title>${escapeXml(post.data.title || "")}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.excerpt || "")}</description>
    </item>`;
		})
		.filter(Boolean)
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${siteTitle} のお知らせ`)}</title>
    <description>${escapeXml(siteDescription)}</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
