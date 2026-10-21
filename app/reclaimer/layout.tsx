import { BottomTabs } from "@/components/bottom-tabs";

export default function ReclaimerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      <main className="flex flex-1 flex-col gap-5 px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
