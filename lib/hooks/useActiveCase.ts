import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export interface CaseStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
}

export interface ActiveCase {
  id: string;
  caseNumber: string;
  trademarkName: string | null;
  status: string;
  steps: CaseStep[];
  createdAt: string;
}

export function useActiveCase() {
  const { data, error, mutate } = useSWR<{ activeCase: ActiveCase | null }>("/api/cases/active", fetcher);

  return {
    activeCase: data?.activeCase || null,
    isLoading: !error && !data,
    error,
    refresh: mutate,
  };
}
