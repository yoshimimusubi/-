import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// リンク先は https のみ、かつ決めたサービスのドメインだけに限る。
// 内容を AI や外部の人が書き換えても、javascript: や見知らぬサイトへのリンクがビルドで止まる
const httpsUrlOn = (hosts: readonly string[]) =>
  z.url({ protocol: /^https$/ }).refine((value) => hosts.includes(new URL(value).hostname), {
    message: `リンク先は ${hosts.join(", ")} のみ使えます`,
  });

const members = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/members" }),
  schema: z
    .object({
      name: z.string().min(1).max(30),
      kana: z.string().max(40).optional(),
      themes: z.array(z.string().min(1).max(20)).min(1).max(5),
      // CSS に埋め込むので形式を厳しく決める（CSS への不正な文字列の混入を防ぐ）
      color: z.string().regex(/^#[0-9a-f]{6}$/, "色は #rrggbb（小文字）で書いてください"),
      order: z.number().int(),
      catchphrase: z.string().max(60).optional(),
      summary: z.string().min(1).max(160),
      links: z
        .object({
          x: httpsUrlOn(["x.com"]).optional(),
          youtube: httpsUrlOn(["www.youtube.com", "youtube.com"]).optional(),
        })
        .strict()
        .default({}),
    })
    .strict(),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z
    .object({
      title: z.string().min(1).max(80),
      date: z.coerce.date(),
      category: z.enum(["info", "event", "goods", "media"]),
      excerpt: z.string().min(1).max(160),
      draft: z.boolean().default(false),
    })
    .strict(),
});

export const collections = { members, news };
