import { describe, expect, it } from "vitest";
import { handleCspReport } from "../worker/csp-report";

function deps(allowed = true) {
  const logs: Array<Record<string, string | number> | undefined> = [];
  return {
    logs,
    deps: {
      clientIp: "203.0.113.10",
      isAllowedByRateLimit: async () => allowed,
      log: (_e: string, d?: Record<string, string | number>) => {
        logs.push(d);
      },
    },
  };
}

const req = (body: string, type = "application/reports+json") =>
  new Request("https://yoshimimusubi.com/api/csp-report", { method: "POST", headers: { "Content-Type": type }, body });

describe("handleCspReport", () => {
  it("違反報告から、オリジンとパスだけを記録する（クエリ文字列は残さない）", async () => {
    const { deps: d, logs } = deps();
    const body = JSON.stringify([
      {
        type: "csp-violation",
        body: {
          effectiveDirective: "script-src-elem",
          blockedURL: "https://evil.example/x.js?token=secret",
          documentURL: "https://yoshimimusubi.com/contact/?email=a@example.com",
        },
      },
    ]);
    const res = await handleCspReport(req(body), d);
    expect(res.status).toBe(204);
    expect(logs).toEqual([{ directive: "script-src-elem", blocked: "https://evil.example", page: "/contact/" }]);
  });

  it("旧形式（report-uri）にも対応する", async () => {
    const { deps: d, logs } = deps();
    const body = JSON.stringify({ "csp-report": { "effective-directive": "style-src-attr", "blocked-uri": "inline", "document-uri": "https://yoshimimusubi.com/" } });
    await handleCspReport(req(body, "application/csp-report"), d);
    expect(logs[0]).toEqual({ directive: "style-src-attr", blocked: "inline", page: "/" });
  });

  it("上限を超えた報告は記録せずに捨てる", async () => {
    const { deps: d, logs } = deps(false);
    const res = await handleCspReport(req("[]"), d);
    expect(res.status).toBe(204);
    expect(logs).toHaveLength(0);
  });

  it("JSON 以外は受け付けない", async () => {
    const { deps: d } = deps();
    expect((await handleCspReport(req("x", "text/plain"), d)).status).toBe(415);
    expect((await handleCspReport(req("{not json"), d)).status).toBe(400);
  });
});
