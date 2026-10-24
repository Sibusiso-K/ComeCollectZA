"use client";

import type { ReactNode } from "react";
import { PrefsProvider } from "@/lib/app/prefs";
import { AuthProvider } from "@/lib/app/auth";
import { TitleSync } from "./title-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <AuthProvider>
        <TitleSync />
        {children}
      </AuthProvider>
    </PrefsProvider>
  );
}
