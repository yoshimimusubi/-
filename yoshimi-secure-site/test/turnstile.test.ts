import { describe, expect, it } from "vitest";
import { verifyTurnstile } from "../worker/turnstile";

const ok = (body: object) => async () => new Response(JSON.stringify(body), { status: 200 });
const base = {
  secret: "0x-real-secret",
  token: "t",
  remoteIp: "203.0.113.10",
  expectedHostname: "yoshimimusubi.com",
  expectedAction: "contact",
};

describe("verifyTurnstile", () => {
  it("成功・ホスト名・action が一致すれば通す", async () => {
    const r = await verifyTurnstile({
      ...base,
      fetchFn: ok({ success: true, hostname: "yoshimimusubi.com", action: "contact" }),
    });
    expect(r.ok).toBe(true);
  });

  it("別サイトで取得したトークン（ホスト名違い）は通さない", async () => {
    const r = await verifyTurnstile({ ...base, fetchFn: ok({ success: true, hostname: "evil.example", action: "contact" }) });
    expect(r).toEqual({ ok: false, reason: "turnstile_hostname_mismatch" });
  });

  it("本番の URL でテスト用シークレットが使われていたら必ず失敗させる", async () => {
    const r = await verifyTurnstile({ ...base, secret: "1x0000000000000000000000000000000AA", fetchFn: ok({ success: true }) });
    expect(r).toEqual({ ok: false, reason: "turnstile_test_secret_in_production" });
  });

  it("シークレット未設定・トークンなし・通信失敗は失敗扱い（閉じる側に倒す）", async () => {
    expect((await verifyTurnstile({ ...base, secret: "", fetchFn: ok({ success: true }) })).ok).toBe(false);
    expect((await verifyTurnstile({ ...base, token: "", fetchFn: ok({ success: true }) })).ok).toBe(false);
    const r = await verifyTurnstile({
      ...base,
      fetchFn: async () => {
        throw new Error("network");
      },
    });
    expect(r).toEqual({ ok: false, reason: "turnstile_unreachable" });
  });
});
