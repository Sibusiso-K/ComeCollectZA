"use client";

import { AppScreen, PageTitle } from "@/components/app/shell";
import { AssistantChat } from "@/components/app/assistant";
import { useT } from "@/lib/app/prefs";

export default function Assistant() {
  const t = useT();
  return (
    <AppScreen>
      <PageTitle>{t("Assistant")}</PageTitle>
      <AssistantChat />
    </AppScreen>
  );
}
