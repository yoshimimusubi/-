/** お問い合わせフォームの受け口（POST /api/contact） */

import { readBodyLimited, seeOther, text, type Logger } from "./http";
import { buildMime } from "./mime";
import type { TurnstileResult } from "./turnstile";
import { CATEGORIES, HONEYPOT_FIELD, TURNSTILE_FIELD, validateContact, type ContactInput } from "./validate";

export const MAX_BODY_BYTES = 16 * 1024;

export const RESULT_PATHS = {
  ok: "/contact/thanks/",
  invalid: "/contact/error/invalid/",
  limit: "/contact/error/limit/",
  verify: "/contact/error/verify/",
  server: "/contact/error/server/",
} as const;

export interface ContactDeps {
  siteOrigin: string;
  clientIp: string | null;
  mailFrom: string;
  mailTo: string;
  isAllowedByRateLimit(key: string): Promise<boolean>;
  verifyHuman(token: string, remoteIp: string | null): Promise<TurnstileResult>;
  sendRawMail(from: string, to: string, raw: string): Promise<void>;
  log: Logger;
  now(): Date;
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  const reject = (reason: string, response: Response) => {
    deps.log("contact_rejected", { reason });
    return response;
  };

  if (request.method !== "POST") {
    return reject("method", text(405, "Method Not Allowed", { Allow: "POST" }));
  }

  // 他サイトからこのフォームへ送らせる攻撃（CSRF）を防ぐ。ブラウザは POST に必ず Origin を付ける
  if (request.headers.get("Origin") !== deps.siteOrigin) {
    return reject("origin", text(403, "Forbidden"));
  }
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return reject("fetch_site", text(403, "Forbidden"));
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return reject("content_type", text(415, "Unsupported Media Type"));
  }

  if (!(await deps.isAllowedByRateLimit(`contact:${deps.clientIp ?? "unknown"}`))) {
    return reject("rate_limit", seeOther(RESULT_PATHS.limit));
  }

  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (raw === null) return reject("body", text(413, "Payload Too Large"));
  const form = new URLSearchParams(raw);

  // 人には見えない項目に入力があればボットとみなす。相手に気づかれないよう完了画面へ送る
  if ((form.get(HONEYPOT_FIELD) ?? "") !== "") {
    return reject("honeypot", seeOther(RESULT_PATHS.ok));
  }

  const result = validateContact(form);
  if (!result.ok) return reject(`invalid:${result.errors.join(",")}`, seeOther(RESULT_PATHS.invalid));

  const human = await deps.verifyHuman(form.get(TURNSTILE_FIELD) ?? "", deps.clientIp);
  if (!human.ok) return reject(human.reason, seeOther(RESULT_PATHS.verify));

  const receivedAt = deps.now();
  const host = new URL(deps.siteOrigin).hostname;
  const mime = buildMime({
    from: deps.mailFrom,
    to: deps.mailTo,
    replyTo: result.value.email,
    subject: `[${host}] お問い合わせ: ${CATEGORIES[result.value.category]}`,
    text: formatMailText(result.value, receivedAt),
    date: receivedAt,
    messageId: `${crypto.randomUUID()}@${host}`,
  });

  try {
    await deps.sendRawMail(deps.mailFrom, deps.mailTo, mime);
  } catch {
    deps.log("contact_mail_failed");
    return seeOther(RESULT_PATHS.server);
  }

  deps.log("contact_accepted", { category: result.value.category });
  return seeOther(RESULT_PATHS.ok);
}

const jst = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatMailText(input: ContactInput, receivedAt: Date): string {
  return [
    "公式サイトのお問い合わせフォームから送信されました。",
    "このメールに返信すると、送信者のメールアドレスに届きます。",
    "",
    `■ 種別: ${CATEGORIES[input.category]}`,
    `■ お名前: ${input.name}`,
    `■ 会社・団体名: ${input.organization || "（記入なし）"}`,
    `■ メールアドレス: ${input.email}`,
    `■ 受信日時: ${jst.format(receivedAt)}（日本時間）`,
    "",
    "■ お問い合わせ内容",
    input.message,
    "",
    "---",
    "フォームの内容はサイト側に保存していません。このメールが唯一の控えです。",
  ].join("\n");
}
