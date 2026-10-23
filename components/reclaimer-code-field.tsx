"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";

// The reclaimer's code, typed or scanned. Looking the reclaimer up comes with the sales route wiring.
export function ReclaimerCodeField() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);

  return (
    <div className="grid gap-3">
      <label className="flex flex-col gap-2 text-sm font-bold">
        Reclaimer code
        <input
          name="reclaimer_qr"
          value={code}
          onChange={(event) => setCode(event.target.value.trim())}
          placeholder="ccza_r_..."
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-14 rounded-xl border-2 border-line bg-canvas px-4 font-mono text-base text-ink focus-visible:outline-3 focus-visible:outline-gold"
        />
      </label>

      {scanning ? (
        <QrScanner
          onScan={(text) => {
            setCode(text.trim());
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      ) : (
        <Button variant="cash" className="w-full" onClick={() => setScanning(true)}>
          Scan the code
        </Button>
      )}

      <Button variant="secondary" className="w-full" disabled>
        Find reclaimer
      </Button>
    </div>
  );
}
