import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, info = m.transcribe("take16k.wav", word_timestamps=True, language="en", vad_filter=False, beam_size=5)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text.strip(), "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in s.words]})
json.dump(out, open("transcript.json", "w"), indent=1)
for s in out:
    print(f"[{s['start']:.2f} - {s['end']:.2f}] {s['text']}")
