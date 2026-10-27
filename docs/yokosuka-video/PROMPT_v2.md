# 横須賀市 スケッター15秒CM ①「それ、特技です。」篇 プロンプト v2

- 元のプロンプト（v1）から、条件（コピー・構成・2種類の納品・禁止事項・色・QR）はそのまま引き継いでいる
- 変えたのは「AIで生成する部分」と「編集で重ねる部分」の分け方、秒単位の動き、縦長の安全領域、人物の固定設定
- 要確認: ①サイネージのサイズ `920×1080px` は v1 の記載のまま。`1920×1080px` の書き間違いなら直す
  （どちらでも使えるよう、①用の素材は「16:9・人物中央寄せ」で作る指示にしてある）

---

## A. Gemini に貼るプロンプト（全体設計を任せる場合）

```text
あなたは、日本の自治体広報向けショートCMの構成作家・映像ディレクターです。
横須賀市の住民に向けて、有償ボランティアマッチングサービス「スケッター」の15秒CMを制作します。
以下の条件をすべて守って、制作物を出力してください。

━━━━━━━━━━━━━━━━
■ コンセプト
「それ、特技です。」
普段の何気ない「好き」「得意」が、福祉施設で誰かの役に立つと気づけるCM。

■ メインコピー
あなたの“ふつう”が、誰かの助けに。

■ サービスの説明（表現の根拠）
・スケッターは、お手伝いを求める福祉事業所と、空き時間で誰かの役に立ちたい地域住民をつなぐサービス。
・無資格・未経験でも参加できる募集がある。お手伝いには謝礼が付く。

■ 表現の禁止事項（すべての場面に適用）
・身体介助（移乗・入浴・食事・排せつの介助など）や医療行為の映像は使わない。
・具体的な謝礼額や、「応募すればすぐ参加できる」など参加が確定する表現は入れない。
・実在する横須賀市の施設・人物・参加者の記録映像だと誤認させない。施設名の看板や実在の建物は出さない。
・似たロゴを生成しない。AIで生成する映像・画像には、文字・ロゴ・QR・字幕・透かしを一切入れない。
━━━━━━━━━━━━━━━━

■ 納品物（2種類・どちらも15秒・MP4）
① 市役所サイネージ用：920×1080px／完全無音（音声トラックなし）
　音がなくても、文字と映像だけで内容が伝わること。
② YouTubeショート・市HP用：1080×1920px（9:16）／明るいBGMと効果音あり
　①の縮小や切り抜きではなく、縦長の構図で文字と人物の配置を設計し直す。
　画面の上部約15％・下部約25％・右端約10％はYouTubeの表示に隠れるため、文字・ロゴ・QRを置かない。

■ 制作方式（重要）
・AI動画生成は1回8秒前後のため、15秒を一度に生成しない。
・人物の3場面（会話・片づけ・音楽）だけを、それぞれ8秒の動画素材として生成する。
　各素材は、GPTで生成した静止画を最初のフレームとして使う（画像から動画）。
・素材は比率ごとに作る。①用は16:9（人物を中央寄せにし、920×1080に切り抜いても欠けない構図）、②用は9:16。
・文字、吹き出し、下線、音符、図形、分割画面、エンドカード、ロゴ、QRは、すべて編集ソフトで重ねる。
・生成時に付く音声は使わない。②のBGMと効果音は編集で付ける（公共利用できるライセンスの音源）。

■ 登場人物（全場面で外見を固定する。すべて架空の人物）
A「話すのが好き」：30代の日本人女性。肩までの髪、アイボリーのニット、明るい笑顔。
B「片づけが得意」：40代の日本人男性。短髪、白シャツに淡いグリーンのエプロン。
C「音楽が好き」：60代の日本人男性。白髪まじり、オレンジのカーディガン、アコースティックギター。
高齢者：70〜80代の日本人男女。自分で座って、会話や手拍子を楽しむ元気な様子。
共通：自然な表情。手指は5本で自然な形。道具の形が崩れない。

■ 舞台
明るいデイサービスの共有スペース。木の床、大きな窓、観葉植物、丸いテーブル。
清潔で温かい昼の自然光。施設名や文字の入った掲示物は置かない。

■ 15秒タイムライン
【0.0〜3.0秒｜話すのが好き】
・0.0〜0.8：アイボリーの背景に、大きな文字「話すのが好き。」が軽くバウンスして登場。
・0.8〜1.2：文字の横から吹き出しが広がり、その形のまま映像に切り替わる（吹き出し型のマスク）。
・1.2〜3.0：映像A。Aが高齢女性と向かい合い、笑い合いながら会話する。見出しは上部に小さく残す。
・1.5〜3.0：テロップ「それ、お話相手の特技です。」
【3.0〜6.0秒｜片づけが得意】
・3.0〜3.6：「片づけが得意。」が左右から集まって1行になる。
・3.6〜4.1：文字の下線が左から右へ伸び、そのまま画面を拭き取るように映像へ切り替わる。
・4.1〜6.0：映像B。Bが共有スペースのテーブルを、左から右へ布巾で拭いて整える（下線の向きとそろえる）。見出しは上部に小さく残す。
・4.4〜6.0：テロップ「それ、助かる特技です。」
【6.0〜9.0秒｜音楽が好き】
・6.0〜6.6：「音楽が好き。」が1文字ずつリズムよく弾む。
・6.6〜7.0：音符と丸い図形が広がり、円形のマスクで映像へ切り替わる。
・7.0〜9.0：映像C。Cがギターを弾き、高齢者が笑顔で手拍子する。見出しは上部に小さく残す。
・7.3〜9.0：テロップ「それ、笑顔をつくる特技です。」
【9.0〜11.0秒｜集合】
・9.0〜9.6：3場面が分割画面として滑り込み、並び直す（①は縦3列、②は横3段）。
・各枠には、素材の最後で人物が自然に微笑むカットを使う。
・9.6〜11.0：大きく「あなたの“ふつう”が、誰かの助けに。」
【11.0〜15.0秒｜エンドカード】
・11.0〜11.4：グリーンの円が広がって切り替わる。
・11.4〜15.0：完全に静止。上から次の順に置く。
　「横須賀市で、できることから。」
　「無資格・未経験OK」「空き時間で参加」「謝礼付き」（アイコン付きのラベル3つ）
　スケッター公式ロゴ／検索窓「スケッター」／公式サイトのQR（https://www.sketter.jp/）
　右下に小さく「※映像はイメージです」
・②では検索窓をQRより大きく扱う（スマホで見ている人は、その画面のQRを読み取れないため）。

■ デザイン
・主色は公式ロゴのグリーン #448338。白、温かいアイボリー、少量のオレンジを合わせる。
・文字は太く読みやすい日本語ゴシック体。白文字はグリーン地の上、濃い色の文字はアイボリー地の上に置く。オレンジは文字ではなく飾りに使う。
・1画面の文字は2行まで。テロップは1.5秒以上表示する。
・ロゴは公式データを使う。
・日本の公共広告に合う、明るく清潔で親しみやすい雰囲気。

■ アニメーション
・静止画の拡大だけで終わらせず、会話・手元・演奏に自然な動きを付ける。
・文字のスライド、軽いバウンス、吹き出しの展開、線の描画、図形による場面転換、分割画面の組み替えを使い、文字や図形の動きが次の場面につながるようにする。
・過剰な点滅、激しい揺れ、顔を隠す装飾は避ける。
・最後の約4秒は動かさず、落ち着いて読める状態にする。

■ 音（②のみ）
・明るいアコースティック系のBGM。テンポは約120BPMで、「音楽が好き。」の弾みを拍にそろえる。
・効果音：文字の登場（ポン）、吹き出し（ふわっ）、下線（シュッ）、エンドカード（軽いチャイム）。
・ナレーションは入れない。

━━━━━━━━━━━━━━━━
■ 出力してほしいもの（この順で）
1. 条件の中に矛盾や不明点があれば、最初に箇条書きで指摘する。
2. 秒数付き絵コンテ（表形式：秒数／映像／文字／動き／音）。①と②で配置が違う所は分けて書く。
3. GPT画像生成用プロンプト：3場面×2比率＝6本。最初のフレーム用。文字・ロゴ・QRは描かせない。
4. 動画生成用プロンプト：3場面×2比率＝6本。英語で、被写体・動作・カメラ・光・雰囲気・禁止事項の順に書く。
5. 編集指示：使う区間（例：素材Aの2.0〜3.8秒）、マスクやキーフレームの付け方、文字サイズの目安。
6. 書き出し設定：①と②それぞれ（解像度、30fps、H.264、音声の有無）。

完成した映像を直接出力できない場合は、その旨を明記したうえで、上記の2〜6を出してください。
```

---

## B. 場面別プロンプト（Gemini で設計させずに、直接作る場合）

流れ: GPT で最初のフレームの画像を作る → Gemini（Veo）にその画像を添付して8秒の動画を作る → 編集ソフトで文字・図形・ロゴ・QR を重ねる。
生成用のプロンプトは英語のほうが指示どおりに出やすいので英語にしてある。

- GPT 画像のサイズ: ①用は横長（1536×1024）、②用は縦長（1024×1536）。動画にするとき 16:9 / 9:16 に切り抜かれるので、人物は中央に、上下左右に余白を取る
- Gemini で縦長（9:16）を選べない場合は、Google Flow で 9:16 を選んで同じプロンプトを使う
- 生成された音声は使わない（①は音声トラックを削除、②は編集で BGM に差し替え）

### 共通（各プロンプトの末尾に付ける）

```text
Photorealistic, natural and warm. Fictional Japanese people. Bright, clean Japanese day-care common room with a wooden floor, large windows, green plants and round wooden tables, soft midday daylight, palette of ivory, white and green with small orange accents. Natural hands with five fingers, objects keep their correct shape. No text, no letters, no captions, no subtitles, no logos, no signboards, no QR codes, no watermark. No physical caregiving, no medical equipment, no wheelchairs being pushed.
```

### 場面A「話すのが好き」

GPT 画像（最初のフレーム）:

```text
A photo of a friendly Japanese woman in her 30s with shoulder-length hair and an ivory knit sweater, sitting across a round wooden table from an elderly Japanese woman in her 80s. Both are mid-conversation and smiling, cups of tea on the table. Medium shot at eye level, both faces in the center of the frame, calm empty space in the upper part of the image. [共通を付ける]
```

Gemini 動画 ①用（16:9）:

```text
8-second video, 16:9, starting from the attached image. The two women chat warmly: the elderly woman tells a story with small hand gestures, the younger woman nods and laughs. Slow, gentle push-in at eye level, subjects kept centered so the frame can be cropped to a narrower width. Ends with both smiling naturally at each other. Keep the upper third calm for text overlay. [共通を付ける]
```

Gemini 動画 ②用（9:16）:

```text
8-second vertical video, 9:16, starting from the attached image. The two women chat warmly: the elderly woman tells a story with small hand gestures, the younger woman nods and laughs. Medium close-up, both faces in the middle of the frame, slow gentle push-in. Keep the top 20% and bottom 30% of the frame calm and uncluttered. Ends with both smiling naturally. [共通を付ける]
```

### 場面B「片づけが得意」

GPT 画像（最初のフレーム）:

```text
A photo of a Japanese man in his 40s with short hair, a white shirt and a light green apron, wiping a round wooden table with a cloth in a day-care common room. Neatly arranged chairs, an elderly Japanese man seated in the background smiling. Medium shot, his hands and the cloth clearly visible, subject in the center. [共通を付ける]
```

Gemini 動画 ①用（16:9）:

```text
8-second video, 16:9, starting from the attached image. The man wipes the table with one smooth stroke from the left side of the frame to the right, then neatly sets two cups and straightens a chair. The camera tracks slowly from left to right with his hands. An elderly man in the background gives a small nod of thanks. Ends with the man smiling naturally. Subject kept centered. [共通を付ける]
```

Gemini 動画 ②用（9:16）:

```text
8-second vertical video, 9:16, starting from the attached image. The man wipes the table with one smooth stroke from left to right, then neatly sets two cups. Medium close-up from a slightly high angle so his hands and the table fill the middle of the frame. Keep the top 20% and bottom 30% calm. Ends with the man smiling naturally. [共通を付ける]
```

### 場面C「音楽が好き」

GPT 画像（最初のフレーム）:

```text
A photo of a Japanese man in his 60s with gray-streaked hair and an orange cardigan, sitting and playing an acoustic guitar with six strings. Three elderly Japanese residents sit in a half circle around him, smiling and clapping. Medium-wide shot, the guitarist in the center. [共通を付ける]
```

Gemini 動画 ①用（16:9）:

```text
8-second video, 16:9, starting from the attached image. The man strums the guitar at a relaxed, cheerful tempo; the elderly residents clap along to the rhythm and smile. Slow camera arc around the group at eye level, guitarist kept centered. Correct hand position on the strings. Ends with the guitarist and residents smiling at each other. [共通を付ける]
```

Gemini 動画 ②用（9:16）:

```text
8-second vertical video, 9:16, starting from the attached image. The man strums the guitar at a relaxed, cheerful tempo; elderly residents beside him clap along and smile. Medium shot framing the guitarist and one or two residents in the middle of the frame, slow gentle push-in. Keep the top 20% and bottom 30% calm. Ends with smiles. [共通を付ける]
```

---

## C. 編集のポイント（CapCut / Premiere / Canva など）

| 秒数 | 使う素材 | 重ねるもの・動き |
|---|---|---|
| 0.0–1.2 | アイボリー背景 → 素材A | 「話すのが好き。」バウンス → 吹き出し型マスクで素材Aへ |
| 1.2–3.0 | 素材A（約1.8秒分） | 見出しを上部に縮小、テロップ 1.5秒〜 |
| 3.0–4.1 | 素材B | 文字が左右から集合 → 下線が左→右に伸びてワイプ |
| 4.1–6.0 | 素材B（拭く動きの区間） | テロップ 4.4秒〜 |
| 6.0–7.0 | 素材C | 1文字ずつバウンス → 音符と円 → 円形マスク |
| 7.0–9.0 | 素材C | テロップ 7.3秒〜 |
| 9.0–11.0 | A・B・C の最後の笑顔 | ①縦3列 / ②横3段に滑り込み → メインコピー |
| 11.0–15.0 | エンドカード | 円ワイプ後は完全静止。ロゴ・検索窓・QR は正規データ |

- 素材から使うのは各2秒前後だけ。動きが最もきれいな区間と、最後の笑顔の区間を選ぶ
- 下線ワイプの向き（左→右）と、場面Bで布巾を動かす向きをそろえると切り替えが自然になる

### 書き出し

| | ① サイネージ | ② YouTubeショート・市HP |
|---|---|---|
| サイズ | 920×1080（要確認） | 1080×1920 |
| フレームレート | 30fps | 30fps |
| 形式 | MP4（H.264） | MP4（H.264） |
| 音声 | トラックなし（市の再生機の指定があれば合わせる） | BGM＋効果音（AAC） |

---

## D. 公開前チェック

- [ ] ①のサイズ（920×1080 か 1920×1080 か）と、再生機の形式・容量の指定を市に確認した
- [ ] ロゴ・QR は公式データを使い、QR は実機の画面から読み取れることを確認した
- [ ] 身体介助・医療行為・謝礼額・参加確定の表現が入っていない
- [ ] AI生成素材に文字化けした看板や文字が写り込んでいない
- [ ] 手指・ギター・食器の形が崩れていない
- [ ] BGM・効果音のライセンスが自治体の公開に使える
- [ ] YouTube へのアップロード時に「改変または合成されたコンテンツ」の開示をオンにした
