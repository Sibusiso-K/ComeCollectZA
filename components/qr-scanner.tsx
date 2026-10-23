"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createQrReader } from "@/lib/vision/qr";

const MAX_WIDTH = 480;
const SCAN_EVERY_MS = 120;

// Opens the rear camera and reads one QR code. Calls onScan with the text, then closes.
export function QrScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Starting the camera…");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        setMessage("The camera is blocked. Allow the camera, or type the code instead.");
        return;
      }
      if (stopped || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      const reader = await createQrReader();
      setMessage("Point the camera at the reclaimer's code.");
      const canvas = document.createElement("canvas");

      async function tick() {
        const video = videoRef.current;
        if (stopped || !video) return;
        if (video.videoWidth) {
          const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          canvas.getContext("2d", { willReadFrequently: true })?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const text = await reader.decode(canvas).catch(() => null);
          if (text) {
            stopped = true;
            onScan(text);
            return;
          }
        }
        timer = window.setTimeout(tick, SCAN_EVERY_MS);
      }
      void tick();
    }

    void start();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // The scanner starts once when it opens. onScan is read at the moment a code is found.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-2" role="dialog" aria-label="Scan a reclaimer code">
      <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-xl bg-board object-cover" />
      <p className="text-sm text-muted" aria-live="polite">
        {message}
      </p>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}
