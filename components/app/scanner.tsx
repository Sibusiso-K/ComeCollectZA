"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, ImagePlus } from "lucide-react";
import { useT } from "@/lib/app/prefs";
import {
  GROUP_TO_MATERIALS,
  MATERIAL_LABEL,
  MATERIALS,
  interpretScan,
  type Group,
  type Interpretation,
  type Material,
  type ScanResult,
} from "@/lib/app/logic";
import { loadClassifier, type ClassifierInput, type LoadPrediction } from "@/lib/vision/waste-classifier";
import { MaterialBadge, PillButton } from "./bits";
import { cn } from "@/lib/utils";

type Phase = "idle" | "camera" | "thinking" | "result";

const GROUP_LABEL: Record<Group, string> = {
  cardboard: "Cardboard",
  glass: "Glass",
  metal: "Metal cans",
  paper: "Paper",
  plastic: "Plastic",
  trash: "Not a recyclable we buy",
  electronics: "Electronics",
};
const QUARTER_NAME = ["Top left", "Top right", "Bottom left", "Bottom right"];

/** A camera-style frame: corner brackets, and an optional line that sweeps up and down while it works. */
function Viewfinder({ children, sweep }: { children: ReactNode; sweep?: boolean }) {
  const corner = "pointer-events-none absolute size-9 border-white/90";
  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/50">
      {children}
      <span aria-hidden className={cn(corner, "left-3 top-3 rounded-tl-2xl border-l-4 border-t-4")} />
      <span aria-hidden className={cn(corner, "right-3 top-3 rounded-tr-2xl border-r-4 border-t-4")} />
      <span aria-hidden className={cn(corner, "bottom-3 left-3 rounded-bl-2xl border-b-4 border-l-4")} />
      <span aria-hidden className={cn(corner, "bottom-3 right-3 rounded-br-2xl border-b-4 border-r-4")} />
      {sweep && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 h-0.5 rounded-full bg-highlight shadow-[0_0_14px_3px_var(--highlight)] motion-safe:animate-[scan-sweep_1.8s_ease-in-out_infinite]"
        />
      )}
    </div>
  );
}

function Shutter({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="grid size-20 place-items-center rounded-full bg-white/90 ring-4 ring-highlight transition-transform active:scale-95 disabled:opacity-60"
      >
        <span className="grid size-14 place-items-center rounded-full bg-white text-[#0b2415]">
          <Camera size={28} aria-hidden />
        </span>
      </button>
      <span className="text-sm font-bold" aria-hidden>{label}</span>
    </div>
  );
}

/**
 * Scans a load with the phone camera or a photo. The model runs in the browser and the photo is never uploaded.
 * After a scan you can tap each quarter of your photo to see what the model made of it.
 * The reclaimer always confirms the material with a tap. Calls onPick with the chosen material.
 */
export function LoadScanner({ onPick }: { onPick: (m: Material) => void }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  const [result, setResult] = useState<{ scan: ScanResult; read: Interpretation } | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };
  const dropPhoto = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setShot(null);
  };
  useEffect(
    () => () => {
      stopCamera();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const startModel = () => {
    loadClassifier(setProgress)
      .then(() => setReady(true))
      .catch(() => setMessage(t("The scanner could not load. Check your connection and try again.")));
  };

  // If the model is already saved on this phone, get it ready now. That uses no data.
  useEffect(() => {
    if (!("caches" in window)) return;
    caches
      .match("/models/tinyclip/onnx/model_int8.onnx")
      .then((hit) => {
        if (!hit) return;
        setSaved(true);
        startModel();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [phase]);

  const openCamera = async () => {
    setMessage("");
    setResult(null);
    setFocus(null);
    dropPhoto();
    if (!ready) startModel();
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
      setReady(true);
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
    setShot(canvas.toDataURL("image/jpeg", 0.75));
    stopCamera();
    void analyse(canvas);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage("");
    setResult(null);
    setFocus(null);
    dropPhoto();
    urlRef.current = URL.createObjectURL(file);
    setShot(urlRef.current);
    if (!ready) startModel();
    void analyse(file);
  };

  const reset = () => {
    stopCamera();
    setResult(null);
    setFocus(null);
    dropPhoto();
    setPhase("idle");
  };

  const percent = Math.round(progress * 100);
  const read = result?.read;
  const confidencePct = result ? Math.round(result.scan.whole.confidence * 100) : 0;
  const q = result && focus !== null ? result.scan.quarters[focus] : null;

  return (
    <section className="glass space-y-4 rounded-3xl p-4" aria-labelledby="scan-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="scan-title" className="text-xl font-extrabold">{t("Scan the load")}</h2>
        <span className="sticker">{t("Stays on your phone")}</span>
      </div>

      {phase === "idle" && (
        <>
          <button onClick={openCamera} aria-label={t("Open camera")} className="block w-full text-left">
            <Viewfinder>
              <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-b from-black/10 to-black/40">
                <span className="flex flex-col items-center gap-2 text-white">
                  <Camera size={44} aria-hidden />
                  <span className="text-lg font-extrabold">{t("Point at your load")}</span>
                  <span className="text-sm opacity-90">{t("Tap to open the camera")}</span>
                </span>
              </div>
            </Viewfinder>
          </button>
          <Shutter onClick={openCamera} label={t("Open camera")} />
          <label className="glass inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-lg font-extrabold focus-within:outline-3 focus-within:outline-primary">
            <ImagePlus size={22} aria-hidden />
            {t("Take or choose a photo")}
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
          </label>
          <p className="text-center text-xs text-muted-foreground">
            {saved ? t("Saved on this phone. Scans work with no data.") : t("First scan downloads about 38 MB once, best on Wi-Fi. After that it works with no data.")}
          </p>
        </>
      )}

      {phase === "camera" && (
        <div className="space-y-3">
          <Viewfinder sweep>
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
          </Viewfinder>
          <Shutter onClick={capture} disabled={!ready} label={t("Scan this load")} />
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {ready ? t("Tap the circle to scan") : t("Getting the scanner ready {percent}%", { percent })}
          </p>
          <PillButton variant="ghost" onClick={reset}>{t("Cancel")}</PillButton>
        </div>
      )}

      {phase === "thinking" && (
        <div className="space-y-3" aria-live="polite">
          <Viewfinder sweep>
            {shot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot} alt="" className="block h-auto w-full opacity-90" />
            ) : (
              <div className="aspect-[4/3] w-full" />
            )}
          </Viewfinder>
          <p className="text-center text-sm text-muted-foreground">
            {ready ? t("Looking at your load…") : t("Getting the scanner ready {percent}%. The first time takes a moment.", { percent })}
          </p>
        </div>
      )}

      {phase === "result" && read && result && (
        <div className="space-y-4" aria-live="polite">
          {shot && (
            <div className="space-y-2">
              <Viewfinder>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot} alt={t("Your photo")} className="block h-auto w-full" />
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {result.scan.quarters.map((qq, i) => (
                      <button
                        key={i}
                        onClick={() => setFocus(focus === i ? null : i)}
                        aria-pressed={focus === i}
                        aria-label={`${t(QUARTER_NAME[i])}: ${t(GROUP_LABEL[qq.group])} ${Math.round(qq.confidence * 100)}%`}
                        className={cn("relative border border-white/40 text-left", focus === i && "border-2 border-highlight bg-highlight/25")}
                      >
                        <span className="absolute bottom-1 left-1 rounded-full bg-black/65 px-2 py-0.5 text-xs font-bold text-white">
                          {qq.group === "trash" ? t("Other") : t(GROUP_LABEL[qq.group])} {Math.round(qq.confidence * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </Viewfinder>
              <p className="text-center text-xs text-muted-foreground">
                {q
                  ? t("{place}: {label}, {pct}% sure", { place: t(QUARTER_NAME[focus!]), label: t(GROUP_LABEL[q.group]), pct: Math.round(q.confidence * 100) })
                  : t("Tap a part of your photo to see what the scanner thought")}
              </p>
            </div>
          )}

          {read.kind === "fact" && (
            <>
              <p className="text-2xl font-extrabold">{t("Looks like {label}", { label: t(GROUP_LABEL[read.group]) })}</p>
              <p className="text-xs text-muted-foreground">{t("{pct}% sure · {ms} ms on your phone", { pct: confidencePct, ms: result.scan.ms })}</p>
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
              <p className="text-2xl font-extrabold">{t("Could be {label}", { label: t(GROUP_LABEL[read.options[0]]) })}</p>
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
              <p className="text-2xl font-extrabold">{t("Looks like a mixed load")}</p>
              <ul className="grid gap-1 text-sm">
                {read.parts.map((p) => (
                  <li key={p.group} className="flex justify-between gap-2">
                    <span className="font-bold">{t(GROUP_LABEL[p.group])}</span>
                    <span className="text-muted-foreground">{t("about {n} of 4 parts", { n: p.share })}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">{t("Centres weigh and pay each material apart. Sort the pile first.")}</p>
              <div className="grid gap-2">
                {read.parts.flatMap((p) => GROUP_TO_MATERIALS[p.group]).map((m) => (
                  <PillButton key={m} onClick={() => onPick(m)}>
                    {t("Sell {label} first", { label: t(MATERIAL_LABEL[m]) })}
                  </PillButton>
                ))}
              </div>
            </>
          )}

          {read.kind === "notBuy" && <p className="text-2xl font-extrabold">{t("Not a recyclable we buy")}</p>}

          {read.kind === "electronics" && (
            <>
              <p className="text-2xl font-extrabold">{read.sure ? t("Looks like electronics") : t("Could be electronics")}</p>
              <p className="text-xs text-muted-foreground">{t("{pct}% sure · {ms} ms on your phone", { pct: Math.round(read.confidence * 100), ms: result.scan.ms })}</p>
              <p className="text-sm text-muted-foreground">
                {t("Buy-back centres do not pay for electronics by the kilogram. You can sell it, give it away, or drop it off safely.")}
              </p>
              <Link href="/ewaste" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">
                {t("What to do with electronics")}
              </Link>
              {!read.sure && <p className="text-sm text-muted-foreground">{t("Not electronics? Pick the material yourself.")}</p>}
            </>
          )}

          {read.kind === "unsure" && (
            <>
              <p className="text-2xl font-extrabold">{t("Not sure what this is")}</p>
              <p className="text-sm text-muted-foreground">{t("Pick the material yourself.")}</p>
            </>
          )}

          {(read.kind === "unsure" || read.kind === "notBuy" || (read.kind === "electronics" && !read.sure)) && (
            <div className="grid grid-cols-3 gap-2">
              {MATERIALS.map((m) => (
                <button key={m} onClick={() => onPick(m)} className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-bold">
                  <MaterialBadge m={m} size={36} />
                  {t(MATERIAL_LABEL[m])}
                </button>
              ))}
            </div>
          )}

          <PillButton variant="ghost" onClick={reset}>{t("Scan again")}</PillButton>
        </div>
      )}

      {message && <p role="status" className="text-sm font-bold text-warning">{message}</p>}
    </section>
  );
}
