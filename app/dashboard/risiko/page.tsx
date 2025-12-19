"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function RisikoRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    
    const params = new URLSearchParams();
    
    searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    
    params.set("showRisk", "true");
    
    const redirectUrl = `/dashboard/recherche${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-gray-600">Weiterleitung zur Markenprüfung...</p>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function RisikoRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <RisikoRedirectContent />
    </Suspense>
  );
}
