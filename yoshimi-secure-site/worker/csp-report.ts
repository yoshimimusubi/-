/** Content-Security-Policy 違反の報告を受け取る（POST /api/csp-report）。URL はパスやオリジンだけ記録する */

import { readBodyLimited, text, type Logger } from "./http";

const MAX_REPORT_BYTES = 8 * 1024;
const MAX_LOGGED_PER_REQUEST = 5;

export interface CspReportDeps {
  clientIp: string | null;
  isAllowedByRateLimit(key: string): Promise<boolean>;
  log: Logger;
}

function originOf(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!value.includes(":")) return value.slice(0, 40); // "inline" "eval" など
  try {
    return new URL(value).origin;
  } catch {
    return "invalid";
  }
}

function pathOf(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return new URL(value).pathname.slice(0, 200);
  } catch {
    return "invalid";
  }
}

export async function handleCspReport(request: Request, deps: CspReportDeps): Promise<Response> {
  if (request.method !== "POST") return text(405, "Method Not Allowed", { Allow: "POST" });

  const contentType = (request.headers.get("Content-Type") ?? "").toLowerCase();
  if (!contentType.startsWith("application/reports+json") && !contentType.startsWith("application/csp-report")) {
    return text(415, "Unsupported Media Type");
  }
  // 大量に送りつけられてもログがあふれないよう、上限を超えた分は黙って捨てる
  if (!(await deps.isAllowedByRateLimit(`csp:${deps.clientIp ?? "unknown"}`))) {
    return new Response(null, { status: 204 });
  }

  const raw = await readBodyLimited(request, MAX_REPORT_BYTES);
  if (raw === null) return text(413, "Payload Too Large");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return text(400, "Bad Request");
  }

  const reports: Array<Record<string, unknown>> = [];
  if (Array.isArray(parsed)) {
    // Reporting API（report-to）の形式
    for (const item of parsed) {
      if (item && typeof item === "object" && (item as { type?: unknown }).type === "csp-violation") {
        const body = (item as { body?: unknown }).body;
        if (body && typeof body === "object") {
          const b = body as Record<string, unknown>;
          reports.push({ directive: b["effectiveDirective"], blocked: b["blockedURL"], page: b["documentURL"] });
        }
      }
    }
  } else if (parsed && typeof parsed === "object" && "csp-report" in parsed) {
    // 旧来の report-uri の形式
    const b = (parsed as { "csp-report": Record<string, unknown> })["csp-report"];
    if (b && typeof b === "object") {
      reports.push({ directive: b["effective-directive"], blocked: b["blocked-uri"], page: b["document-uri"] });
    }
  }

  for (const report of reports.slice(0, MAX_LOGGED_PER_REQUEST)) {
    deps.log("csp_violation", {
      directive: typeof report["directive"] === "string" ? report["directive"].slice(0, 40) : "",
      blocked: originOf(report["blocked"]),
      page: pathOf(report["page"]),
    });
  }
  return new Response(null, { status: 204 });
}
