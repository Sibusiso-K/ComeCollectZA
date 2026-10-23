"use client";

import type { ReactNode } from "react";
import { PrefsProvider } from "@/lib/app/prefs";
import { AuthProvider } from "@/lib/app/auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <AuthProvider>{children}</AuthProvider>
    </PrefsProvider>
  );
}
