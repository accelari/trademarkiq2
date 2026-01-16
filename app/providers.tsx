"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { AnalyticsProvider } from "@/components/analytics-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
        }}
      >
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
