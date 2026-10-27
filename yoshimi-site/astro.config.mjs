import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import icon from "astro-iconset";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		ssr: {
			optimizeDeps: {
				// Pre-bundle so it isn't discovered mid-render, which would trigger
				// a Vite dep re-optimization and break in-flight worker imports
				// under the Cloudflare dev runner (workerd).
				include: ["astro-iconset/components"],
			},
		},
	},
	integrations: [
		react(),
		icon({
			// Only ship the Phosphor icons actually referenced in templates,
			// not the full @iconify-json/ph set (which adds megabytes to the
			// deployed worker bundle).
			include: {
				ph: [
					"arrow-left",
					"arrow-right",
					"arrow-up-right",
					"arrows-clockwise",
					"bell-simple",
					"buildings",
					"calendar-blank",
					"chart-bar",
					"chat-circle",
					"chat-circle-dots",
					"check",
					"check-circle",
					"clock",
					"cloud",
					"code",
					"currency-dollar",
					"envelope",
					"file-text",
					"game-controller",
					"gauge",
					"globe",
					"hand-heart",
					"heart",
					"key",
					"leaf",
					"lifebuoy",
					"lightning",
					"list",
					"lock",
					"map-pin",
					"microphone",
					"newspaper",
					"pause",
					"phone",
					"play",
					"plug",
					"plus",
					"puzzle-piece",
					"robot",
					"rss",
					"shield-check",
					"smiley",
					"sparkle",
					"star",
					"stethoscope",
					"sun",
					"t-shirt",
					"thermometer-simple",
					"trend-up",
					"users-three",
					"x",
					"x-logo",
					"youtube-logo",
				],
			},
		}),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			// 公式のフォームプラグイン。お問い合わせフォームは管理画面（または AI）で作る。
			// スパム対策は既定でハニーポット。Turnstile にする場合はフォームごとに切り替える。
			plugins: [formsPlugin({ defaultSpamProtection: "honeypot" })],
		}),
	],
	// 和文フォント。Google Fonts は文字ごとに分割配信されるので、ページで使う文字の分だけ読み込まれる。
	// 分割ファイルが多いため Base.astro では preload しない。
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Zen Kaku Gothic New",
			cssVariable: "--font-body",
			weights: [400, 500, 700],
			fallbacks: ["Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", "sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Zen Old Mincho",
			cssVariable: "--font-display",
			weights: [500, 700],
			fallbacks: ["Hiragino Mincho ProN", "Yu Mincho", "serif"],
		},
	],
	devToolbar: { enabled: false },
});
