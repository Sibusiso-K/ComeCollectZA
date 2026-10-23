"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/app/prefs";

/** Camera QR scanner. Frames are read in the browser only and never sent anywhere. */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const jsQR = (await import("jsqr")).default;
        const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const tick = async () => {
          if (stopped || !video.current) return;
          const v = video.current;
          if (v.videoWidth) {
            let text: string | null = null;
            if (detector) {
              const codes = await detector.detect(v).catch(() => []);
              text = codes[0]?.rawValue ?? null;
            } else {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(v, 0, 0);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                text = jsQR(img.data, img.width, img.height)?.data ?? null;
              }
            }
            if (text) {
              onResult(text);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        void tick();
      } catch {
        setError(t("The camera did not open. Type the code instead."));
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult, t]);

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur">
      <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{t("Scan the code")}</h2>
          <button onClick={onClose} aria-label={t("Close")} className="grid size-12 place-items-center rounded-full bg-secondary">
            <X />
          </button>
        </div>
        {error ? (
          <p className="font-bold">{error}</p>
        ) : (
          <video ref={video} playsInline muted className="aspect-square w-full rounded-2xl bg-secondary object-cover" />
        )}
      </div>
    </div>
  );
}
