/** 通知メール（text/plain・UTF-8）の組み立て。ヘッダーには利用者の入力をそのまま入れない */

export interface MailParts {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  date: Date;
  messageId: string;
}

function assertHeaderSafe(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error("header value must not contain line breaks");
  return value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** RFC 2047 の encoded-word。文字の途中で切らないよう、1 語あたり 45 バイト以内で区切る */
export function encodeHeaderWord(value: string): string {
  const encoder = new TextEncoder();
  const words: string[] = [];
  let chunk: number[] = [];
  for (const char of assertHeaderSafe(value)) {
    const bytes = encoder.encode(char);
    if (chunk.length + bytes.length > 45) {
      words.push(`=?UTF-8?B?${bytesToBase64(Uint8Array.from(chunk))}?=`);
      chunk = [];
    }
    chunk.push(...bytes);
  }
  if (chunk.length > 0) words.push(`=?UTF-8?B?${bytesToBase64(Uint8Array.from(chunk))}?=`);
  return words.join("\r\n ");
}

export function buildMime(parts: MailParts): string {
  const body = bytesToBase64(new TextEncoder().encode(parts.text.replace(/\r?\n/g, "\r\n")));
  const headers = [
    `From: ${assertHeaderSafe(parts.from)}`,
    `To: ${assertHeaderSafe(parts.to)}`,
    `Reply-To: ${assertHeaderSafe(parts.replyTo)}`,
    `Subject: ${encodeHeaderWord(parts.subject)}`,
    `Date: ${parts.date.toUTCString()}`,
    `Message-ID: <${assertHeaderSafe(parts.messageId)}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body.replace(/.{1,76}/g, "$&\r\n")}`;
}
