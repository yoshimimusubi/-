import { describe, expect, it } from "vitest";
import { handleContact, RESULT_PATHS } from "../worker/contact";
import { contactRequest, fakeDeps, formBody, validFields } from "./helpers";

function decodeMailBody(raw: string): string {
  const body = raw.split("\r\n\r\n")[1] ?? "";
  return new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\r\n/g, "")), (c) => c.charCodeAt(0)));
}

describe("handleContact", () => {
  it("正しい送信はメールを 1 通送って完了画面へ 303 で移動する", async () => {
    const { deps, sent } = fakeDeps();
    const res = await handleContact(contactRequest(), deps);
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.ok);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.raw).toContain("Reply-To: hanako@example.com");
    expect(decodeMailBody(sent[0]!.raw)).toContain("タイアップのご相談です。");
  });

  it("POST 以外は 405", async () => {
    const { deps } = fakeDeps();
    const res = await handleContact(contactRequest("", {}, "GET"), deps);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });

  it("別サイトからの送信（Origin 違い・なし）は 403（CSRF 対策）", async () => {
    const { deps, sent } = fakeDeps();
    expect((await handleContact(contactRequest(formBody(), { Origin: "https://evil.example" }), deps)).status).toBe(403);
    const noOrigin = new Request("https://yoshimimusubi.com/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody(),
    });
    expect((await handleContact(noOrigin, deps)).status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("Sec-Fetch-Site が same-origin 以外なら 403", async () => {
    const { deps } = fakeDeps();
    const res = await handleContact(contactRequest(formBody(), { "Sec-Fetch-Site": "cross-site" }), deps);
    expect(res.status).toBe(403);
  });

  it("フォーム以外の Content-Type は 415", async () => {
    const { deps } = fakeDeps();
    const res = await handleContact(contactRequest("{}", { "Content-Type": "application/json" }), deps);
    expect(res.status).toBe(415);
  });

  it("大きすぎる本文は 413", async () => {
    const { deps, sent } = fakeDeps();
    const res = await handleContact(contactRequest(formBody({ ...validFields, message: "あ".repeat(20000) })), deps);
    expect(res.status).toBe(413);
    expect(sent).toHaveLength(0);
  });

  it("連続送信は上限で止めてエラー画面へ", async () => {
    const { deps, sent } = fakeDeps({ isAllowedByRateLimit: async () => false });
    const res = await handleContact(contactRequest(), deps);
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.limit);
    expect(sent).toHaveLength(0);
  });

  it("見えない項目（ハニーポット）に入力があれば、送らずに完了画面へ", async () => {
    const { deps, sent, logs } = fakeDeps();
    const res = await handleContact(contactRequest(formBody({ ...validFields, website: "https://spam.example" })), deps);
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.ok);
    expect(sent).toHaveLength(0);
    expect(logs.some((l) => l.detail?.["reason"] === "honeypot")).toBe(true);
  });

  it("入力エラーはエラー画面へ。ログに入力内容を残さない", async () => {
    const { deps, sent, logs } = fakeDeps();
    const res = await handleContact(contactRequest(formBody({ ...validFields, email: "not-an-email" })), deps);
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.invalid);
    expect(sent).toHaveLength(0);
    expect(JSON.stringify(logs)).not.toContain("not-an-email");
    expect(JSON.stringify(logs)).not.toContain("山田");
  });

  it("ボット判定に失敗したら送らない", async () => {
    const { deps, sent } = fakeDeps();
    const res = await handleContact(
      contactRequest(formBody({ ...validFields, "cf-turnstile-response": "token-bad" })),
      deps,
    );
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.verify);
    expect(sent).toHaveLength(0);
  });

  it("メール送信に失敗したらサーバーエラー画面へ", async () => {
    const { deps } = fakeDeps({
      sendRawMail: async () => {
        throw new Error("boom");
      },
    });
    const res = await handleContact(contactRequest(), deps);
    expect(res.headers.get("Location")).toBe(RESULT_PATHS.server);
  });

  it("件名に利用者の入力を入れない（なりすまし・ヘッダー改ざん対策）", async () => {
    const { deps, sent } = fakeDeps();
    await handleContact(contactRequest(formBody({ ...validFields, name: "至急 振込先変更のお願い" })), deps);
    const subjectLines = sent[0]!.raw.split("\r\n\r\n")[0]!;
    const decoded = [...subjectLines.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)]
      .map((m) => new TextDecoder().decode(Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0))))
      .join("");
    expect(decoded).toContain("お仕事のご相談");
    expect(decoded).not.toContain("振込先");
  });
});
