import type { ContactDeps } from "../worker/contact";

export const ORIGIN = "https://yoshimimusubi.com";

export const validFields = {
  name: "山田 花子",
  organization: "テスト株式会社",
  email: "hanako@example.com",
  category: "work",
  message: "タイアップのご相談です。詳しくはご返信ください。",
  consent: "yes",
  website: "",
  "cf-turnstile-response": "token-ok",
};

export function formBody(fields: Record<string, string> = validFields): string {
  return new URLSearchParams(fields).toString();
}

export function contactRequest(
  body: string = formBody(),
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request(`${ORIGIN}/api/contact`, {
    method,
    headers: {
      Origin: ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    ...(method === "GET" || method === "HEAD" ? {} : { body }),
  });
}

export function fakeDeps(overrides: Partial<ContactDeps> = {}) {
  const sent: Array<{ from: string; to: string; raw: string }> = [];
  const logs: Array<{ event: string; detail: Record<string, string | number> | undefined }> = [];
  const deps: ContactDeps = {
    siteOrigin: ORIGIN,
    clientIp: "203.0.113.10",
    mailFrom: "noreply@yoshimimusubi.com",
    mailTo: "inbox@example.com",
    isAllowedByRateLimit: async () => true,
    verifyHuman: async (token) => (token === "token-ok" ? { ok: true } : { ok: false, reason: "turnstile_rejected" }),
    sendRawMail: async (from, to, raw) => {
      sent.push({ from, to, raw });
    },
    log: (event, detail) => {
      logs.push({ event, detail });
    },
    now: () => new Date("2026-10-30T16:47:00Z"),
    ...overrides,
  };
  return { deps, sent, logs };
}
