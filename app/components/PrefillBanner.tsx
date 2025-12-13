"use client";

import { Info, Pencil } from "lucide-react";

interface PrefillBannerProps {
  source: "consultation" | "previous_search";
  date?: string;
  onEdit?: () => void;
}

export default function PrefillBanner({ source, date, onEdit }: PrefillBannerProps) {
  const getText = () => {
    if (source === "consultation") {
      return date
        ? `Basierend auf Ihrer Beratung vom ${date}`
        : "Basierend auf Ihrer Beratung";
    }
    return date
      ? `Basierend auf Ihrer vorherigen Recherche vom ${date}`
      : "Basierend auf Ihrer vorherigen Recherche";
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm text-primary font-medium">{getText()}</p>
      </div>
      
      {onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary-hover transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Ändern</span>
        </button>
      )}
    </div>
  );
}
