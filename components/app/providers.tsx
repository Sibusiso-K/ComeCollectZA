"use client";

import type { ReactNode } from "react";
import { PrefsProvider } from "@/lib/app/prefs";

export function Providers({ children }: { children: ReactNode }) {
  return <PrefsProvider>{children}</PrefsProvider>;
}
