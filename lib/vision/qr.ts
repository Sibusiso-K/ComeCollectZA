// QR code reading for the centre console. Browser only.
// Uses the phone's built-in BarcodeDetector where it exists (most Android phones) and jsQR everywhere else (iPhone).

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export type QrReader = {
  engine: "BarcodeDetector" | "jsQR";
  decode: (canvas: HTMLCanvasElement) => Promise<string | null>;
};

export async function createQrReader(): Promise<QrReader> {
  const Native = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (Native) {
    try {
      const detector = new Native({ formats: ["qr_code"] });
      return {
        engine: "BarcodeDetector",
        decode: async (canvas) => (await detector.detect(canvas))[0]?.rawValue ?? null,
      };
    } catch {
      // Some browsers expose the constructor but not the QR format. Fall through to jsQR.
    }
  }

  const { default: jsQR } = await import("jsqr");
  return {
    engine: "jsQR",
    decode: async (canvas) => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
    },
  };
}
