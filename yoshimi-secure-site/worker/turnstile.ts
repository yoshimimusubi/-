/** Cloudflare Turnstile（ボット判定）の結果をサーバー側で確かめる */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare が公開しているテスト用シークレット。本番の URL で使われていたら必ず失敗させる
export const TEST_SECRETS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

export interface TurnstileOptions {
  secret: string;
  token: string;
  remoteIp: string | null;
  expectedHostname: string;
  expectedAction: string;
  fetchFn?: typeof fetch;
}

interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(options: TurnstileOptions): Promise<TurnstileResult> {
  const { secret, token, remoteIp, expectedHostname, expectedAction, fetchFn = fetch } = options;
  const isLocal = expectedHostname === "localhost" || expectedHostname === "127.0.0.1";
  const isTestSecret = TEST_SECRETS.has(secret);

  if (!secret) return { ok: false, reason: "turnstile_secret_missing" };
  if (isTestSecret && !isLocal) return { ok: false, reason: "turnstile_test_secret_in_production" };
  if (!token || token.length > 2048) return { ok: false, reason: "turnstile_token_missing" };

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);
  body.append("idempotency_key", crypto.randomUUID());

  let data: SiteverifyResponse;
  try {
    const res = await fetchFn(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `turnstile_http_${res.status}` };
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: "turnstile_unreachable" };
  }

  if (!data.success) return { ok: false, reason: "turnstile_rejected" };
  // テスト用シークレットは hostname・action を返さないので、ローカル確認のときだけ照合を省く
  if (!isTestSecret) {
    if (data.hostname !== expectedHostname) return { ok: false, reason: "turnstile_hostname_mismatch" };
    if (data.action !== expectedAction) return { ok: false, reason: "turnstile_action_mismatch" };
  }
  return { ok: true };
}
