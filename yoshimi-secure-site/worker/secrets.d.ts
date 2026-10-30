// `wrangler secret put` で登録する秘密の値。wrangler.jsonc には書かないので、型だけここで宣言する
interface Env {
  TURNSTILE_SECRET_KEY: string;
}
