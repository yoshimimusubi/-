const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_COLOR = "#b23a48";

/** The talent's image colour from the CMS, or the brand red when it is empty or malformed. */
export function talentColor(color: string | null | undefined): string {
	return color && HEX_COLOR.test(color) ? color : FALLBACK_COLOR;
}

/** First visible character of the name, for the placeholder when there is no portrait. */
export function talentInitial(name: string): string {
	return [...name.trim()][0] ?? "";
}

export function talentPath(slug: string): string {
	return `/talents/${slug}`;
}

/** Only http(s) links from the CMS are rendered as outbound links. */
export function safeExternalUrl(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
	} catch {
		return undefined;
	}
}
