"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView, getSessionId } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // Session initialisieren
    getSessionId();
  }, []);

  useEffect(() => {
    // Page View tracken bei Pfadänderung
    if (pathname && pathname !== lastPathname.current) {
      trackPageView(pathname);
      lastPathname.current = pathname;
    }
  }, [pathname]);

  return <>{children}</>;
}
