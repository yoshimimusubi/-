#!/usr/bin/env python3
"""GPT-SoVITS 用リファレンス音声の自動選定・切り出し・文字起こし。

使い方:
    python select_reference.py INPUT_AUDIO [--out-dir DIR] [--whisper-model large-v3]

入力は ffmpeg が読める形式なら何でもよい（wav / mp3 / m4a / webm / mp4 など）。
出力:
    DIR/reference_voice.wav   選ばれた 3〜5 秒の区間（16bit PCM, mono, 44.1kHz または 48kHz）
    DIR/reference_text.txt    その区間の文字起こし
    DIR/candidates.json       上位候補のスコア内訳（聞き比べ用）
    DIR/candidate_N.wav       上位候補 2 位以下の切り出し（--keep-candidates 指定時）

選定の考え方:
    1. 無音で区切った発話単位を作り、3〜5 秒に収まる区間を候補にする
       （単語の途中で切らないよう、必ず無音の切れ目で始まり・終わる）
    2. 各候補を次の指標で採点する
       - 明るさ: 有声区間の F0 中央値（高いほど加点）
       - 抑揚:   F0 の標準偏差（半音単位。大きいほど加点、極端すぎると減点）
       - 明瞭さ: 推定 SNR、有声率、スペクトル平坦度（BGM・ノイズが少ないほど加点）
       - 破綻:   クリップ（音割れ）があれば大きく減点
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa

MIN_SEC, MAX_SEC = 3.0, 5.0
HOP = 512


def load_audio(path):
    """ffmpeg で mono float32 にデコードする。元が 48kHz ならそのまま、それ以外は 44.1kHz。"""
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=sample_rate", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True)
    src_sr = int(probe.stdout.strip().splitlines()[0])
    sr = 48000 if src_sr == 48000 else 44100
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(sr),
         "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy(), sr


def utterance_spans(y, sr, top_db=35, min_gap=0.25):
    """無音で区切った発話区間 [(start, end), ...]（サンプル単位）。短い息継ぎはつなげる。"""
    spans = librosa.effects.split(y, top_db=top_db, frame_length=2048, hop_length=HOP)
    merged = []
    for s, e in spans:
        if merged and (s - merged[-1][1]) / sr < min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(int(s), int(e)) for s, e in merged]


def candidate_windows(spans, sr):
    """連続する発話区間をつなげて 3〜5 秒に収まる組み合わせを列挙する。"""
    out = []
    for i in range(len(spans)):
        for j in range(i, len(spans)):
            dur = (spans[j][1] - spans[i][0]) / sr
            if dur > MAX_SEC:
                break
            if dur >= MIN_SEC:
                out.append((spans[i][0], spans[j][1]))
    return out


def features(y, sr, s, e, noise_rms):
    seg = y[s:e]
    f0, voiced, _ = librosa.pyin(seg, fmin=120, fmax=1100, sr=sr,
                                 frame_length=2048, hop_length=HOP)
    vf0 = f0[voiced & np.isfinite(f0)]
    if len(vf0) < 10:
        return None
    semis = 12 * np.log2(vf0 / np.median(vf0))
    rms = librosa.feature.rms(y=seg, frame_length=2048, hop_length=HOP)[0]
    flat = librosa.feature.spectral_flatness(y=seg, n_fft=2048, hop_length=HOP)[0]
    return {
        "start_sec": round(s / sr, 3),
        "end_sec": round(e / sr, 3),
        "duration_sec": round((e - s) / sr, 3),
        "f0_median_hz": round(float(np.median(vf0)), 1),
        "f0_std_semitones": round(float(np.std(semis)), 2),
        "f0_range_semitones": round(float(np.percentile(semis, 95) - np.percentile(semis, 5)), 2),
        "voiced_ratio": round(float(np.mean(voiced)), 3),
        "snr_db": round(float(20 * np.log10(np.percentile(rms, 75) / max(noise_rms, 1e-6))), 1),
        "spectral_flatness": round(float(np.median(flat)), 4),
        "clip_ratio": round(float(np.mean(np.abs(seg) > 0.99)), 5),
    }


def score_all(feats):
    """候補同士の相対評価（z スコアの重み付き和）。"""
    def z(key):
        v = np.array([f[key] for f in feats], dtype=float)
        sd = v.std()
        return (v - v.mean()) / sd if sd > 0 else np.zeros_like(v)

    # 抑揚は大きいほど良いが、叫び・裏返りのような極端な値は減点する
    std = np.array([f["f0_std_semitones"] for f in feats])
    tone = np.minimum(std, 5.0) - np.maximum(std - 5.0, 0) * 2

    total = (1.0 * z("f0_median_hz")
             + 1.0 * (tone - tone.mean()) / (tone.std() or 1)
             + 1.2 * z("snr_db")
             + 0.6 * z("voiced_ratio")
             - 0.6 * z("spectral_flatness"))
    for f, t in zip(feats, total):
        f["score"] = round(float(t - (50 if f["clip_ratio"] > 1e-4 else 0)), 3)
    return sorted(feats, key=lambda f: f["score"], reverse=True)


def write_clip(path, y, sr, s, e, pad_sec=0.05):
    """前後に少し余白を残し、端を 10ms フェードして -1dBFS にピーク正規化。16bit PCM で保存。"""
    s = max(0, s - int(pad_sec * sr))
    e = min(len(y), e + int(pad_sec * sr))
    clip = y[s:e].copy()
    fade = int(0.01 * sr)
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(clip))
    if peak > 0:
        clip *= 10 ** (-1 / 20) / peak
    sf.write(path, clip, sr, subtype="PCM_16")


def transcribe(path, model_name):
    from faster_whisper import WhisperModel
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(str(path), language="ja", beam_size=5,
                               vad_filter=False, condition_on_previous_text=False)
    return "".join(s.text for s in segs).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--whisper-model", default="large-v3",
                    help="faster-whisper のモデル名またはローカルパス。'none' で文字起こしを省略")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--keep-candidates", action="store_true")
    args = ap.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    y, sr = load_audio(args.input)
    print(f"loaded: {len(y) / sr:.1f}s @ {sr}Hz", file=sys.stderr)

    frame_rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]
    noise_rms = float(np.percentile(frame_rms, 10))

    spans = utterance_spans(y, sr)
    windows = candidate_windows(spans, sr)
    if not windows:
        sys.exit("3〜5 秒に収まる発話区間が見つかりませんでした")
    print(f"utterances: {len(spans)}, candidate windows: {len(windows)}", file=sys.stderr)

    feats = [f for f in (features(y, sr, s, e, noise_rms) for s, e in windows) if f]
    ranked = score_all(feats)[: args.top]

    best = ranked[0]
    ref_path = out / "reference_voice.wav"
    write_clip(ref_path, y, sr, int(best["start_sec"] * sr), int(best["end_sec"] * sr))
    if args.keep_candidates:
        for i, f in enumerate(ranked[1:], start=2):
            write_clip(out / f"candidate_{i}.wav", y, sr,
                       int(f["start_sec"] * sr), int(f["end_sec"] * sr))

    if args.whisper_model != "none":
        best["text"] = transcribe(ref_path, args.whisper_model)
        (out / "reference_text.txt").write_text(best["text"] + "\n", encoding="utf-8")

    (out / "candidates.json").write_text(
        json.dumps({"sample_rate": sr, "candidates": ranked}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    print(json.dumps(best, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
