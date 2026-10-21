"use client";

import { useEffect, useState } from "react";
import { formatRand } from "@/lib/money";
import { Button } from "@/components/ui/button";

// The payment moment: the amount counts up from zero. Reduced motion shows the final amount at once.
export function MoneyMoment({ cents, caption }: { cents: number; caption: string }) {
  const [shown, setShown] = useState(cents);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(cents);
      return;
    }

    let start: number | null = null;
    let frame = 0;
    const duration = 900;
    setShown(0);

    const step = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(cents * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    // Animation frames pause in hidden tabs, so a timer always lands on the final amount.
    const settle = window.setTimeout(() => setShown(cents), duration + 100);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [cents, run]);

  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl bg-green-soft p-6 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-green text-2xl font-extrabold text-on-green"
      >
        R
      </span>
      <p className="font-mono text-xs uppercase tracking-wider text-muted">You have been paid</p>
      <p className="font-mono text-4xl font-semibold text-green tabular-nums" aria-live="polite">
        +{formatRand(shown)}
      </p>
      <p className="text-sm text-muted">{caption}</p>
      <Button variant="secondary" onClick={() => setRun((n) => n + 1)} className="w-auto">
        Replay
      </Button>
    </section>
  );
}
