import type { APIRoute } from "astro";
import { getMembers } from "../lib/content";

// メンバーのイメージカラーを CSS ファイルとして書き出す。
// HTML に style 属性を書かないので、CSP の style-src を 'self' のまま保てる
export const GET: APIRoute = async () => {
  const members = await getMembers();
  const css = members.map((m) => `[data-member="${m.id}"]{--member:${m.data.color}}`).join("\n");
  return new Response(`${css}\n`, { headers: { "Content-Type": "text/css; charset=utf-8" } });
};
