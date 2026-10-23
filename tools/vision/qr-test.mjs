// Checks that jsQR reads QR codes like the ones the app shows (qrcode.react output), at several sizes and with a dark and a light theme.
import QRCode from "qrcode";
import jsQR from "jsqr";

const tokens = ["ccza_r_7Q2KX9", "ccza_r_OTHER01", "ccza_r_" + "A".repeat(40)];

function render(text, scale, invert) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 4;
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - quiet;
      const my = Math.floor(y / scale) - quiet;
      const dark = Boolean(mx >= 0 && my >= 0 && mx < n && my < n && qr.modules.get(my, mx));
      const v = dark !== invert ? 0 : 255;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, size };
}

let ok = 0;
let total = 0;
for (const t of tokens) {
  for (const scale of [3, 5, 8]) {
    for (const invert of [false, true]) {
      const { data, size } = render(t, scale, invert);
      const result = jsQR(data, size, size, { inversionAttempts: "attemptBoth" });
      total++;
      if (result?.data === t) ok++;
      else console.log("FAIL", t, "scale", scale, "invert", invert, "->", result?.data ?? null);
    }
  }
}
console.log(ok + "/" + total + " decoded correctly");
