"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefs, useT } from "@/lib/app/prefs";
import {
  GROUP_TO_MATERIALS,
  MATERIAL_LABEL,
  interpretScan,
  type Group,
  type Interpretation,
  type Material,
  type ScanResult,
} from "@/lib/app/logic";
import { loadClassifier, type ClassifierInput, type LoadPrediction } from "@/lib/vision/waste-classifier";
import { MaterialBadge, PillButton } from "./bits";

type Phase = "idle" | "camera" | "thinking" | "result";

const GROUP_LABEL: Record<Group, string> = {
  cardboard: "Cardboard",
  glass: "Glass",
  metal: "Metal cans",
  paper: "Paper",
  plastic: "Plastic",
  trash: "Not a recyclable we buy",
};

const ALL: Material[] = ["cans", "pet", "hdpe", "cardboard", "paper", "glass"];

/**
 * Scans a load with the phone camera or a photo. The model runs in the browser and the photo is never uploaded.
 * The reclaimer always confirms the material with a tap. Calls onPick with the chosen material.
 */
export function LoadScanner({ onPick }: { onPick: (m: Material) => void }) {
  const t = useT();
  const { dataSaver } = usePrefs();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ scan: ScanResult; read: Interpretation } | null>(null);
  const [message, setMessage] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };
  useEffect(() => stopCamera, []);
  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [phase]);

  const startModel = () => {
    loadClassifier(setProgress)
      .then(() => setReady(true))
      .catch(() => setMessage(t("The scanner could not load. Check your connection and try again.")));
  };

  const openCamera = async () => {
    setMessage("");
    setResult(null);
    startModel();
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setPhase("camera");
    } catch {
      setMessage(t("The camera is blocked. Use the photo button instead."));
      setPhase("idle");
    }
  };

  const analyse = async (input: ClassifierInput) => {
    setPhase("thinking");
    try {
      const classifier = await loadClassifier(setProgress);
      const load: LoadPrediction = await classifier.classifyLoad(input);
      const scan: ScanResult = { whole: load.whole, quarters: load.quarters, ms: load.ms };
      setResult({ scan, read: interpretScan(scan) });
      setPhase("result");
    } catch {
      setMessage(t("The scan did not work. Pick the material yourself."));
      setPhase("idle");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 448 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    void analyse(canvas);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage("");
    setResult(null);
    startModel();
    void analyse(file);
  };

  const reset = () => {
    stopCamera();
    setResult(null);
    setPhase("idle");
  };

  const percent = Math.round(progress * 100);
  const read = result?.read;
  const confidencePct = result ? Math.round(result.scan.whole.confidence * 100) : 0;

  return (
    <section className="glass space-y-4 rounded-3xl p-5" aria-labelledby="scan-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="scan-title" className="font-display text-xl font-bold">{t("Scan the load")}</h2>
        <span className="sticker">{t("Stays on your phone")}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {ready || progress > 0
          ? t("Saved on this phone. Scans work with no data.")
          : t("First scan downloads about 38 MB once, best on Wi-Fi. After that it works with no data.")}
      </p>

      {phase === "idle" && (
        <div className="grid gap-2">
          <PillButton onClick={openCamera}>{t("Open camera")}</PillButton>
          <label className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full border-2 border-foreground px-6 font-display text-lg font-bold focus-within:outline-3 focus-within:outline-primary">
            {t("Take or choose a photo")}
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
          </label>
        </div>
      )}

      {phase === "camera" && (
        <div className="grid gap-2">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-2xl bg-secondary object-cover" />
          <PillButton variant="cta" onClick={capture} disabled={!ready}>
            {ready ? t("Scan this load") : t("Getting the scanner ready {percent}%", { percent })}
          </PillButton>
          <PillButton variant="ghost" onClick={reset}>{t("Cancel")}</PillButton>
        </div>
      )}

      {phase === "thinking" && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {ready ? t("Looking at your load…") : t("Getting the scanner ready {percent}%. The first time takes a moment.", { percent })}
        </p>
      )}

      {phase === "result" && read && (
        <div className="space-y-4" aria-live="polite">
          {read.kind === "fact" && (
            <>
              <p className="font-display text-2xl font-extrabold">
                {t("Looks like {label}", { label: t(GROUP_LABEL[read.group]) })}
              </p>
              <p className="text-xs text-muted-foreground">{t("{pct}% sure · {ms} ms on your phone", { pct: confidencePct, ms: result!.scan.ms })}</p>
              <div className="grid gap-2">
                {GROUP_TO_MATERIALS[read.group].map((m) => (
                  <PillButton key={m} onClick={() => onPick(m)}>
                    {t("Yes, {label}", { label: t(MATERIAL_LABEL[m]) })}
                  </PillButton>
                ))}
              </div>
            </>
          )}

          {read.kind === "question" && (
            <>
              <p className="font-display text-2xl font-extrabold">{t("Could be {label}", { label: t(GROUP_LABEL[read.options[0]]) })}</p>
              <p className="text-sm text-muted-foreground">{t("Which one is it?")}</p>
              <div className="grid gap-2">
                {read.options.flatMap((g) => GROUP_TO_MATERIALS[g]).map((m) => (
                  <PillButton key={m} variant="ghost" onClick={() => onPick(m)}>
                    {t("Yes, {label}", { label: t(MATERIAL_LABEL[m]) })}
                  </PillButton>
                ))}
              </div>
            </>
          )}

          {read.kind === "mixed" && (
            <>
              <p className="font-display text-2xl font-extrabold">{t("Looks like a mixed load")}</p>
              <ul className="grid gap-1 text-sm">
                {read.parts.map((p) => (
                  <li key={p.group} className="flex justify-between gap-2">
                    <span className="font-bold">{t(GROUP_LABEL[p.group])}</span>
                    <span className="text-muted-foreground">{t("about {n} of 4 parts", { n: p.share })}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                {t("Centres weigh and pay each material apart. Sort the pile first.")}
              </p>
              <div className="grid gap-2">
                {read.parts.flatMap((p) => GROUP_TO_MATERIALS[p.group]).map((m) => (
                  <PillButton key={m} onClick={() => onPick(m)}>
                    {t("Sell {label} first", { label: t(MATERIAL_LABEL[m]) })}
                  </PillButton>
                ))}
              </div>
            </>
          )}

          {read.kind === "notBuy" && (
            <p className="font-display text-2xl font-extrabold">{t("Not a recyclable we buy")}</p>
          )}

          {read.kind === "unsure" && (
            <>
              <p className="font-display text-2xl font-extrabold">{t("Not sure what this is")}</p>
              <p className="text-sm text-muted-foreground">{t("Pick the material yourself.")}</p>
            </>
          )}

          {(read.kind === "unsure" || read.kind === "notBuy") && (
            <div className="grid grid-cols-3 gap-2">
              {ALL.map((m) => (
                <button key={m} onClick={() => onPick(m)} className="flex flex-col items-center gap-1 rounded-2xl bg-card p-3 text-sm font-bold">
                  <MaterialBadge m={m} size={36} />
                  {t(MATERIAL_LABEL[m])}
                </button>
              ))}
            </div>
          )}

          <button className="min-h-12 w-full rounded-full border border-border font-bold" onClick={reset}>
            {t("Scan again")}
          </button>
        </div>
      )}

      {message && <p role="status" className="text-sm font-bold text-warning">{message}</p>}
      {dataSaver && phase === "idle" && <span className="sr-only">{t("Data saver is on")}</span>}
    </section>
  );
}
