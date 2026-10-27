import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";
import { formatDate } from "../utils/news";

/**
 * /llms.txt -- a plain-text map of the site for AI assistants and AI search.
 * Built from the CMS on every request (cached for an hour), so it never drifts
 * from what visitors see. Format: https://llmstxt.org/
 */
export const GET: APIRoute = async ({ site, url }) => {
	const origin = (site?.toString() || url.origin).replace(/\/$/, "");
	const [settings, talents, news, pages] = await Promise.all([
		getSiteSettings(),
		getEmDashCollection("talents", { orderBy: { sort_order: "asc", published_at: "asc" } }),
		getEmDashCollection("news", { orderBy: { published_at: "desc" }, limit: 10 }),
		getEmDashCollection("pages", { orderBy: { title: "asc" } }),
	]);

	const title = settings?.title || "ヨシミムスビ";
	const lines: string[] = [`# ${title}`, ""];
	if (settings?.tagline) lines.push(`> ${settings.tagline}`, "");
	lines.push(
		`${title}は、看護・介護・健康・美容をテーマに発信するキャラクタープロジェクト「あっぷるぐみ」を運営しています。`,
		"医療や健康の話題では、診断・治療・効果を断定しない方針で発信しています。",
		"",
	);

	if (talents.entries.length > 0) {
		lines.push("## メンバー（あっぷるぐみ）", "");
		for (const talent of talents.entries) {
			const { title: name, theme, summary } = talent.data;
			const detail = [theme, summary].filter(Boolean).join("。");
			lines.push(`- [${name}](${origin}/talents/${talent.id}): ${detail}`);
		}
		lines.push("");
	}

	if (news.entries.length > 0) {
		lines.push("## お知らせ（新しい順）", "");
		for (const post of news.entries) {
			const date = formatDate(post.data.publishedAt);
			const excerpt = post.data.excerpt ? `: ${post.data.excerpt}` : "";
			lines.push(`- [${post.data.title}](${origin}/news/${post.id})（${date}）${excerpt}`);
		}
		lines.push("");
	}

	const otherPages = pages.entries.filter((page) => page.id !== "home");
	if (otherPages.length > 0) {
		lines.push("## ページ", "");
		for (const page of otherPages) {
			lines.push(`- [${page.data.title}](${origin}/${page.id})`);
		}
		lines.push("");
	}

	lines.push(
		"## Optional",
		"",
		`- [お知らせの RSS](${origin}/rss.xml)`,
		`- [サイトマップ](${origin}/sitemap.xml)`,
		"",
	);

	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
