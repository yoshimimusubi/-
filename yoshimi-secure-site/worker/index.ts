/**
 * サイトで唯一の「動く部分」。/api/* だけがここに来て、ほかのページは静的ファイルとして配信される。
 * 秘密の値（Turnstile のシークレット）は `wrangler secret put` で登録し、コードや設定ファイルには書かない。
 */

import { EmailMessage } from "cloudflare:email";
import { handleContact } from "./contact";
import { handleCspReport } from "./csp-report";
import { text, withSecurityHeaders, type Logger } from "./http";
import { verifyTurnstile } from "./turnstile";

const log: Logger = (event, detail = {}) => {
  console.log(JSON.stringify({ event, ...detail }));
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const clientIp = request.headers.get("CF-Connecting-IP");
    const isAllowedByRateLimit = async (key: string) => (await env.CONTACT_LIMITER.limit({ key })).success;

    if (url.pathname === "/api/contact" || url.pathname === "/api/contact/") {
      return withSecurityHeaders(
        await handleContact(request, {
          siteOrigin: env.SITE_ORIGIN,
          clientIp,
          mailFrom: env.MAIL_FROM,
          mailTo: env.MAIL_TO,
          isAllowedByRateLimit,
          verifyHuman: async (token, remoteIp) => {
            const result = await verifyTurnstile({
              secret: env.TURNSTILE_SECRET_KEY,
              token,
              remoteIp,
              expectedHostname: new URL(env.SITE_ORIGIN).hostname,
              expectedAction: "contact",
            });
            if (!result.ok) log("turnstile_failed", { reason: result.reason });
            return result;
          },
          sendRawMail: async (from, to, raw) => {
            await env.MAILER.send(new EmailMessage(from, to, raw));
          },
          log,
          now: () => new Date(),
        }),
      );
    }

    if (url.pathname === "/api/csp-report") {
      return withSecurityHeaders(await handleCspReport(request, { clientIp, isAllowedByRateLimit, log }));
    }

    return withSecurityHeaders(text(404, "Not Found"));
  },
} satisfies ExportedHandler<Env>;
