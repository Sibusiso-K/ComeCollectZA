"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { isReclaimerCode } from "@/lib/reclaimer-code";

// The reclaimer's code, typed or scanned. Looking the reclaimer up comes with the sales route wiring.
export function ReclaimerCodeField() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [rejected, setRejected] = useState(false);
  const invalid = code.length > 0 && !isReclaimerCode(code);

  return (
    <div className="grid gap-3">
      <label className="flex flex-col gap-2 text-sm font-bold">
        Reclaimer code
        <input
          name="reclaimer_qr"
          value={code}
          onChange={(event) => {
            setRejected(false);
            setCode(event.target.value.trim().slice(0, 39));
          }}
          maxLength={39}
          aria-invalid={invalid}
          placeholder="ccza_r_..."
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-14 rounded-xl border-2 border-line bg-canvas px-4 font-mono text-base text-ink focus-visible:outline-3 focus-visible:outline-gold"
        />
      </label>
      {rejected ? (
        <p role="alert" className="text-sm font-bold text-bad">That QR code is not a ComeCollectZA reclaimer code. Ask the reclaimer to open Show my code.</p>
      ) : invalid ? (
        <p className="text-sm text-muted">Codes look like ccza_r_7Q2KX9.</p>
      ) : null}

      {scanning ? (
        <QrScanner
          onScan={(text) => {
            const scanned = text.trim();
            setScanning(false);
            // Only ComeCollectZA codes are accepted. Other QR codes, such as links, are ignored.
            if (isReclaimerCode(scanned)) {
              setRejected(false);
              setCode(scanned);
            } else {
              setRejected(true);
            }
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
