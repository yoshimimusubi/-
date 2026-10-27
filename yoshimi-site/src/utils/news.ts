const DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "Asia/Tokyo",
});

/** 2026/10/27 の形。サイトは日本向けなので、見る人の環境によらず日本時間で表示する。 */
export function formatDate(date: Date | null | undefined): string {
	return date ? DATE_FORMAT.format(date) : "";
}

export function newsPath(slug: string): string {
	return `/news/${slug}`;
}
