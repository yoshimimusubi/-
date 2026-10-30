/** サイト全体で使う固定の情報。【】の部分は公開前に差し替える（docs/REPLACE_CHECKLIST.md） */

export const SITE = {
  name: "ヨシミムスビ",
  legalName: "株式会社ヨシミムスビ",
  tagline: "ケアと暮らしを、キャラクターでむすぶ。",
  description:
    "株式会社ヨシミムスビは、看護・介護・健康・美容をテーマに発信するキャラクタープロジェクト「あっぷるぐみ」を運営しています。",
  url: "https://yoshimimusubi.com",
  locale: "ja_JP",
} as const;

export const NAV = [
  { href: "/members/", label: "メンバー" },
  { href: "/news/", label: "お知らせ" },
  { href: "/company/", label: "会社概要" },
  { href: "/security/", label: "セキュリティ" },
] as const;

export const NEWS_CATEGORIES = {
  info: "お知らせ",
  event: "イベント・出演",
  goods: "グッズ",
  media: "メディア・タイアップ",
} as const;

export interface CompanyRow {
  label: string;
  value: string;
}

export const COMPANY: CompanyRow[] = [
  { label: "社名", value: "株式会社ヨシミムスビ" },
  { label: "代表者", value: "【代表者名】" },
  { label: "設立", value: "【設立年月】" },
  { label: "所在地", value: "【所在地（番地まで出すかは要検討）】" },
  {
    label: "事業内容",
    value: [
      "キャラクタープロジェクト「あっぷるぐみ」の企画・運営",
      "VTuber・キャラクターを活用した情報発信、タイアップの企画",
      "イベント・配信のキャスティング",
      "キャラクターグッズ・コンテンツの企画・制作",
    ].join("\n"),
  },
];

/** なりすまし対策として、会社として運用しているアカウントをここに並べる */
export const COMPANY_ACCOUNTS: Array<{ label: string; href: string }> = [
  // { label: "ヨシミムスビ公式 X", href: "https://x.com/【アカウント】" },
];
