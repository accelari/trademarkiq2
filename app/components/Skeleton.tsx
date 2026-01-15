"use client";

import { cn } from "@/lib/utils";

/**
 * Zentrale Skeleton-Komponenten für Loading-States
 * 
 * Diese Komponenten verbessern die UX, indem sie während des Ladens
 * Platzhalter anzeigen, die die Form des erwarteten Inhalts widerspiegeln.
 */

// ============================================
// Basis-Skeleton
// ============================================

interface SkeletonProps {
  className?: string;
}

/**
 * Basis-Skeleton-Komponente mit Pulse-Animation
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  );
}

// ============================================
// Text-Skeletons
// ============================================

interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

/**
 * Skeleton für Textzeilen
 */
export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton für eine Überschrift
 */
export function HeadingSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-8 w-48", className)} />;
}

/**
 * Skeleton für einen Titel mit Untertitel
 */
export function TitleSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

// ============================================
// Card-Skeletons
// ============================================

interface CardSkeletonProps {
  className?: string;
  hasImage?: boolean;
  hasFooter?: boolean;
}

/**
 * Skeleton für eine Karte
 */
export function CardSkeleton({ className, hasImage, hasFooter }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5", className)}>
      {hasImage && (
        <Skeleton className="h-40 w-full mb-4 rounded-lg" />
      )}
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      {hasFooter && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton für eine Statistik-Karte
 */
export function StatCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ============================================
// Liste-Skeletons
// ============================================

interface ListSkeletonProps {
  items?: number;
  className?: string;
}

/**
 * Skeleton für eine Liste von Elementen
 */
export function ListSkeleton({ items = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
        >
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton für eine Transaktionsliste
 */
export function TransactionListSkeleton({ items = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Tabellen-Skeletons
// ============================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Skeleton für eine Tabelle
 */
export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("rounded-lg border border-gray-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4 flex-1",
                    colIndex === 0 ? "w-1/4" : ""
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Akkordeon-Skeletons
// ============================================

interface AccordionSkeletonProps {
  items?: number;
  className?: string;
}

/**
 * Skeleton für Akkordeon-Elemente (wie auf der Case-Seite)
 */
export function AccordionSkeleton({ items = 9, className }: AccordionSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <HeadingSkeleton />
      <Skeleton className="h-12 w-64" />
      <div className="space-y-4">
        {Array.from({ length: items }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Dashboard-Skeletons
// ============================================

/**
 * Skeleton für das Dashboard-Layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TitleSkeleton />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton hasFooter />
        </div>
        <div>
          <ListSkeleton items={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton für die Credits-Seite
 */
export function CreditsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <TitleSkeleton />
      
      {/* Balance Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-12 w-40 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>
      
      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <Skeleton className="h-6 w-24 mb-3" />
            <Skeleton className="h-10 w-20 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton für die Cases-Liste
 */
export function CasesListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TitleSkeleton />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      
      {/* Search & Filter */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* Cases Grid */}
      <div className="space-y-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 mt-1" />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-3 mb-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
                {/* Step Progress */}
                <div className="flex gap-1">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-12 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton für die Admin-Benutzer-Seite
 */
export function UsersListSkeleton({ items = 10 }: ListSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <TitleSkeleton />
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Search */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      
      {/* Table */}
      <TableSkeleton rows={items} columns={6} />
    </div>
  );
}

/**
 * Skeleton für die Admin-Kosten-Seite
 */
export function CostsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TitleSkeleton />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
      
      {/* Table */}
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

/**
 * Skeleton für den Chat-Monitor
 */
export function ChatMonitorSkeleton({ items = 10 }: ListSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <TitleSkeleton />
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>
      
      {/* Messages */}
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
