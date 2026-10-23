"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { bestGuess, mixFrom, suggestFrom, type Mix, type Suggestion } from "@/lib/vision/suggestion";
import { loadClassifier, type ClassifierInput } from "@/lib/vision/waste-classifier";

type Phase = "idle" | "camera" | "thinking" | "result";

const MAX_SIDE = 448;

// Scans a load with the phone camera and suggests a material. The model runs on the phone, so the photo
// is never uploaded. The reclaimer always confirms the material with a tap.
export function MaterialScanner({ onPick }: { onPick: (material: MaterialCode) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [modelReady, setModelReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [mix, setMix] = useState<Mix | null>(null);
  const [ms, setMs] = useState(0);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => stopCamera, []);

  // The service worker keeps the model after the first scan. Say so, so nobody waits for Wi-Fi they do not need.
  useEffect(() => {
    if (!("caches" in window)) return;
    caches
      .match("/models/tinyclip/onnx/model_int8.onnx")
      .then((hit) => setSaved(Boolean(hit)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [phase]);

  function startModel() {
    loadClassifier(setProgress)
      .then(() => setModelReady(true))
      .catch(() => setMessage("The scanner could not load. Check your connection and try again."));
  }

  async function openCamera() {
    setMessage("");
    setSuggestion(null);
    startModel();
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setPhase("camera");
    } catch {
      setMessage("The camera is blocked. Use the photo button instead.");
      setPhase("idle");
    }
  }

  async function analyse(input: ClassifierInput) {
    setPhase("thinking");
    try {
      const classifier = await loadClassifier(setProgress);
      const load = await classifier.classifyLoad(input);
      setMs(load.ms);
      setSuggestion(suggestFrom(bestGuess(load)));
      setMix(mixFrom(load));
      setPhase("result");
    } catch {
      setMessage("The scan did not work. Pick the material yourself.");
      setPhase("idle");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    void analyse(canvas);
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setSuggestion(null);
    startModel();
    void analyse(file);
  }

  function reset() {
    stopCamera();
    setSuggestion(null);
    setMix(null);
    setPhase("idle");
  }

  function choose(material: MaterialCode) {
    onPick(material);
    reset();
  }

  const percent = Math.round(progress * 100);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold">Scan the load</h3>
        <span className="text-xs text-muted">Stays on your phone</span>
      </div>
      <p className="text-xs text-muted">
        {modelReady || saved
          ? "Saved on this phone. Scans work with no data."
          : "First scan downloads about 38 MB once, best on Wi-Fi. After that it works with no data."}
      </p>

      {phase === "idle" && (
        <div className="grid gap-2">
          <Button onClick={openCamera}>Open camera</Button>
          <label className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-ink px-5 text-base font-bold text-ink focus-within:outline-3 focus-within:outline-gold">
            Take or choose a photo
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
          </label>
        </div>
      )}

      {phase === "camera" && (
        <div className="grid gap-2">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-board object-cover" />
          <Button variant="cash" onClick={capture} disabled={!modelReady}>
            {modelReady ? "Scan this load" : "Getting the scanner ready " + percent + "%"}
          </Button>
          <Button variant="secondary" onClick={reset}>
            Cancel
          </Button>
        </div>
      )}

      {phase === "thinking" && (
        <p className="text-sm text-muted" aria-live="polite">
          {modelReady ? "Looking at your load…" : "Getting the scanner ready " + percent + "%. The first time takes a moment."}
        </p>
      )}

      {phase === "result" && mix && (
        <div className="grid gap-3" aria-live="polite">
          <div>
            <p className="font-display text-xl font-extrabold">Looks like a mixed load</p>
            <p className="text-xs text-muted">{ms} ms on your phone</p>
          </div>
          <ul className="grid gap-1 text-sm">
            {mix.parts.map((part) => (
              <li key={part.label} className="flex justify-between gap-2">
                <span className="font-bold">{part.label}</span>
                <span className="text-muted">about {part.quarters} of 4 parts</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Centres weigh and pay each material apart. Sort the pile first, then sell one material at a time.
          </p>
          <div className="grid gap-2">
            {mix.parts.flatMap((part) =>
              part.candidates.map((code) => (
                <Button key={code} onClick={() => choose(code)}>
                  Sell {MATERIALS[code as Exclude<MaterialCode, "OTHER">].label} first
                </Button>
              )),
            )}
          </div>
          <Button variant="secondary" onClick={reset}>
            Scan again
          </Button>
        </div>
      )}

      {phase === "result" && !mix && suggestion && (
        <div className="grid gap-3" aria-live="polite">
          <div>
            <p className="font-display text-xl font-extrabold">
              {suggestion.level === "sure" && "Looks like " + suggestion.label}
              {suggestion.level === "maybe" && "Could be " + suggestion.label}
              {suggestion.level === "unsure" && "Not sure what this is"}
            </p>
            <p className="text-xs text-muted">
              {Math.round(suggestion.confidence * 100)}% sure · {ms} ms on your phone
            </p>
          </div>

          {suggestion.level !== "unsure" && suggestion.candidates.length > 0 ? (
            <div className="grid gap-2">
              {suggestion.candidates.length > 1 && (
                <p className="text-sm text-muted">Plastic can be more than one price. Which one is it?</p>
              )}
              {suggestion.candidates.map((code) => (
                <Button key={code} onClick={() => choose(code)}>
                  Yes, {MATERIALS[code as Exclude<MaterialCode, "OTHER">].label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Pick the material yourself from the tiles below.</p>
          )}

          <Button variant="secondary" onClick={reset}>
            Scan again
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-bad" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
