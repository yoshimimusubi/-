import { describe, expect, it } from "vitest";
import { validateContact } from "../worker/validate";
import { validFields } from "./helpers";

const check = (fields: Record<string, string>) => validateContact(new URLSearchParams(fields));
const errorsOf = (fields: Record<string, string>) => {
  const r = check(fields);
  return r.ok ? [] : r.errors;
};

describe("validateContact", () => {
  it("正しい入力を受け付け、前後の空白を取る", () => {
    const r = check({ ...validFields, name: "  山田 花子  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("山田 花子");
  });

  it("会社名は空でもよい", () => {
    expect(check({ ...validFields, organization: "" }).ok).toBe(true);
  });

  it.each([
    ["改行入りの名前（ヘッダー改ざん）", { name: "a\r\nBcc: x@example.com" }, "name"],
    ["改行入りのメールアドレス", { email: "a@example.com\r\nBcc: x@example.com" }, "email"],
    ["表示名つきのアドレス", { email: "Foo <a@example.com>" }, "email"],
    ["ドメインのないアドレス", { email: "a@localhost" }, "email"],
    ["文字の向きを変える制御文字", { name: "abc‮def" }, "name"],
    ["長すぎる名前", { name: "あ".repeat(51) }, "name"],
    ["短すぎる本文", { message: "短い" }, "message"],
    ["ヌル文字入りの本文", { message: "こんにちは\u0000これはテストです" }, "message"],
    ["一覧にない種別", { category: "admin" }, "category"],
    ["同意なし", { consent: "" }, "consent"],
  ])("%s を拒否する", (_label, patch, field) => {
    expect(errorsOf({ ...validFields, ...patch })).toContain(field);
  });

  it("本文の改行とタブは許す", () => {
    expect(check({ ...validFields, message: "1 行目\r\n2 行目\n\t3 行目です" }).ok).toBe(true);
  });

  it("知らない項目や、同じ項目の重複を拒否する", () => {
    expect(errorsOf({ ...validFields, admin: "1" })).toContain("unknown_field");
    const dup = new URLSearchParams(validFields);
    dup.append("email", "other@example.com");
    const r = validateContact(dup);
    expect(r.ok ? [] : r.errors).toContain("duplicate_field");
  });

  it("文字数は見た目の文字（コードポイント）で数える", () => {
    expect(check({ ...validFields, name: "🍎".repeat(50) }).ok).toBe(true);
  });
});
