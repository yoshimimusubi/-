const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const formatDate = (date: Date) => dateFormatter.format(date);
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** 【】で囲んだ仮の文字を見分けて、プレビューで目立たせる */
export function splitPlaceholders(value: string): Array<{ text: string; todo: boolean }> {
  return value
    .split(/(【[^】]*】)/)
    .filter(Boolean)
    .map((text) => ({ text, todo: text.startsWith("【") }));
}

/**
 * JSON-LD を <script> に入れるときは "<" を必ずエスケープする。
 * 内容に "</script>" が含まれていても、そこでタグが閉じないようにするため
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
