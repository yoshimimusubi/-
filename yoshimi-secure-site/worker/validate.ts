/** お問い合わせフォームの入力チェック。ブラウザ側のチェックは迂回できるので、ここが最終判断になる */

export const CATEGORIES = {
  work: "お仕事のご相談（タイアップ・出演など）",
  press: "取材・メディア",
  security: "セキュリティ・脆弱性のご報告",
  other: "そのほか",
} as const;

export type Category = keyof typeof CATEGORIES;

export interface ContactInput {
  name: string;
  organization: string;
  email: string;
  category: Category;
  message: string;
}

export const HONEYPOT_FIELD = "website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

const ALLOWED_FIELDS = new Set([
  "name",
  "organization",
  "email",
  "category",
  "message",
  "consent",
  HONEYPOT_FIELD,
  TURNSTILE_FIELD,
]);

export const LIMITS = {
  name: 50,
  organization: 100,
  email: 254,
  messageMin: 10,
  messageMax: 3000,
} as const;

// 1 行の項目に入れてはいけない文字（改行・制御文字・双方向テキストの制御文字）
const SINGLE_LINE_FORBIDDEN = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/u;
// 本文で許す制御文字は改行とタブだけ
const MULTI_LINE_FORBIDDEN = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩]/u;
// 返信先ヘッダーに入るので ASCII のみ・空白や引用符を含まない形に限る
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export type ValidationResult =
  | { ok: true; value: ContactInput }
  | { ok: false; errors: string[] };

const length = (s: string) => [...s].length;

export function validateContact(form: URLSearchParams): ValidationResult {
  const errors: string[] = [];

  for (const key of new Set(form.keys())) {
    if (!ALLOWED_FIELDS.has(key)) errors.push(`unknown_field`);
    // 同じ名前の項目を複数送ってくる改ざん（パラメータ汚染）を拒否する
    if (form.getAll(key).length > 1) errors.push(`duplicate_field`);
  }

  const get = (key: string) => (form.get(key) ?? "").normalize("NFC").trim();
  const name = get("name");
  const organization = get("organization");
  const email = get("email");
  const category = get("category");
  const message = get("message").replace(/\r\n?/g, "\n");

  if (!name || length(name) > LIMITS.name || SINGLE_LINE_FORBIDDEN.test(name)) errors.push("name");
  if (length(organization) > LIMITS.organization || SINGLE_LINE_FORBIDDEN.test(organization)) {
    errors.push("organization");
  }
  if (email.length > LIMITS.email || !EMAIL.test(email)) errors.push("email");
  if (!Object.hasOwn(CATEGORIES, category)) errors.push("category");
  if (
    length(message) < LIMITS.messageMin ||
    length(message) > LIMITS.messageMax ||
    MULTI_LINE_FORBIDDEN.test(message)
  ) {
    errors.push("message");
  }
  if (form.get("consent") !== "yes") errors.push("consent");

  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };
  return {
    ok: true,
    value: { name, organization, email, category: category as Category, message },
  };
}
