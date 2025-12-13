"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSearches() {
  const { data, error, isLoading, mutate } = useSWR("/api/searches", fetcher);
  return { searches: data || [], error, isLoading, mutate };
}

export function usePlaybooks() {
  const { data, error, isLoading, mutate } = useSWR("/api/playbooks", fetcher);
  return { playbooks: data || [], error, isLoading, mutate };
}

export function useWatchlist() {
  const { data, error, isLoading, mutate } = useSWR("/api/watchlist", fetcher);
  return { items: data || [], error, isLoading, mutate };
}

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR("/api/alerts", fetcher);
  return { alerts: data || [], error, isLoading, mutate };
}

export function useTeam() {
  const { data, error, isLoading, mutate } = useSWR("/api/team", fetcher);
  return { team: data, error, isLoading, mutate };
}

export function useExperts(search?: string, location?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (location) params.set("location", location);
  const url = `/api/experts${params.toString() ? `?${params.toString()}` : ""}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);
  return { experts: data || [], error, isLoading, mutate };
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard/stats", fetcher);
  return { stats: data, error, isLoading, mutate };
}

export function useApplications() {
  const { data, error, isLoading, mutate } = useSWR("/api/applications", fetcher);
  return { applications: data || [], error, isLoading, mutate };
}

export function useApplication(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/applications/${id}` : null,
    fetcher
  );
  return { application: data, error, isLoading, mutate };
}
