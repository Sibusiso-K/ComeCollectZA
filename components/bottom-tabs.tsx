"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ScanLine, TrendingUp, Wallet } from "lucide-react";

const tabs = [
  { href: "/reclaimer", label: "Home", Icon: House },
  { href: "/reclaimer/prices", label: "Prices", Icon: TrendingUp },
  { href: "/reclaimer/sell", label: "Sell", Icon: ScanLine },
  { href: "/reclaimer/money", label: "Money", Icon: Wallet },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-4 border-t border-line bg-surface px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = href === "/reclaimer" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "flex flex-col items-center gap-1 rounded-xl py-1 text-xs font-bold focus-visible:outline-3 focus-visible:outline-gold " +
              (active ? "text-green" : "text-muted")
            }
          >
            <Icon aria-hidden="true" className="h-6 w-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
