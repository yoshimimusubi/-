import { describe, expect, it } from "vitest";
import { buildMime, encodeHeaderWord } from "../worker/mime";

const base = {
  from: "noreply@yoshimimusubi.com",
  to: "inbox@example.com",
  replyTo: "hanako@example.com",
  subject: "お問い合わせ",
  text: "本文です\n2 行目",
  date: new Date("2026-10-30T16:47:00Z"),
  messageId: "abc@yoshimimusubi.com",
};

describe("mime", () => {
  it("ヘッダーに改行を入れようとしたら例外にする", () => {
    expect(() => buildMime({ ...base, replyTo: "a@example.com\r\nBcc: x@example.com" })).toThrow();
    expect(() => encodeHeaderWord("件名\nBcc: x")).toThrow();
  });

  it("日本語の件名を UTF-8 の encoded-word にし、1 語 75 文字以内に収める", () => {
    const encoded = encodeHeaderWord("あ".repeat(60));
    for (const word of encoded.split("\r\n ")) expect(word.length).toBeLessThanOrEqual(75);
    const decoded = encoded
      .split("\r\n ")
      .map((w) => w.slice("=?UTF-8?B?".length, -2))
      .map((b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
    const joined = new Uint8Array(decoded.reduce((n, a) => n + a.length, 0));
    let off = 0;
    for (const a of decoded) {
      joined.set(a, off);
      off += a.length;
    }
    expect(new TextDecoder().decode(joined)).toBe("あ".repeat(60));
  });

  it("本文は base64 で 76 文字ごとに折り返す", () => {
    const raw = buildMime({ ...base, text: "あ".repeat(500) });
    const body = raw.split("\r\n\r\n")[1]!;
    for (const line of body.split("\r\n")) expect(line.length).toBeLessThanOrEqual(76);
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8");
  });
});
