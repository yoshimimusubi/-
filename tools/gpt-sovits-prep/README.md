# GPT-SoVITS リファレンス音声の前処理

`select_reference.py` は、元音声から GPT-SoVITS の参考音声に向いた 3〜5 秒の区間を自動で選んで切り出し、
その区間を文字起こしする。

## 準備（初回のみ）

```bash
pip install numpy scipy soundfile librosa faster-whisper yt-dlp
# ffmpeg が必要（macOS: brew install ffmpeg / Windows: winget install ffmpeg）
```

## 実行

```bash
# 1. YouTube から音声だけ取り出す（自分たちで権利を持つ動画に限る）
yt-dlp -x --audio-format wav -o "source.%(ext)s" "https://youtu.be/<動画ID>"

# 2. 選定・切り出し・文字起こし
python tools/gpt-sovits-prep/select_reference.py source.wav --out-dir out --keep-candidates
```

## 出力

| ファイル | 内容 |
|---|---|
| `out/reference_voice.wav` | 1 位の区間（16bit PCM / mono / 元が 48kHz なら 48kHz、それ以外は 44.1kHz） |
| `out/reference_text.txt` | その区間の文字起こし（GPT-SoVITS の「参考音声のテキスト」欄に入れる） |
| `out/candidates.json` | 上位 5 候補の開始・終了秒とスコアの内訳 |
| `out/candidate_N.wav` | 2 位以下の候補（`--keep-candidates` 指定時） |

文字起こしは Whisper の自動結果なので、必ず耳で聞いて 1 文字ずつ確認すること。
参考テキストが実際の発声と 1 文字でもずれると、生成音声の発音が崩れやすい。

## 採点の中身

- 明るさ: 有声区間の F0（声の高さ）の中央値
- 抑揚: F0 の揺れ幅（半音単位）。大きいほど加点するが、5 半音を超える極端な揺れは減点
- 明瞭さ: 推定 SNR、有声率、スペクトル平坦度（BGM や雑音が少ないほど加点）
- 音割れ: クリップがある区間は大きく減点

BGM が大きい動画では、先に UVR5（GPT-SoVITS 同梱）でボーカルを分離した wav を入力にすると精度が上がる。
