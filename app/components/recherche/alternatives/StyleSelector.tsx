"use client";

import { Sparkles, Zap, Palette, Building2 } from "lucide-react";

export type GeneratorStyle = "similar" | "modern" | "creative" | "serious";

interface StyleSelectorProps {
  selected: GeneratorStyle;
  onChange: (style: GeneratorStyle) => void;
}

const styles: { id: GeneratorStyle; label: string; icon: typeof Sparkles; description: string }[] = [
  {
    id: "similar",
    label: "Ähnlich",
    icon: Sparkles,
    description: "Behält Klang/Bedeutung",
  },
  {
    id: "modern",
    label: "Modern",
    icon: Zap,
    description: "Tech-fokussiert, kurz",
  },
  {
    id: "creative",
    label: "Kreativ",
    icon: Palette,
    description: "Kunstwörter, ungewöhnlich",
  },
  {
    id: "serious",
    label: "Seriös",
    icon: Building2,
    description: "Klassisch, vertrauenswürdig",
  },
];

export function StyleSelector({ selected, onChange }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {styles.map((style) => {
        const Icon = style.icon;
        const isSelected = selected === style.id;
        return (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-gray-500"}`} />
              <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-gray-700"}`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">{style.description}</p>
            {isSelected && (
              <div className="mt-2 flex justify-end">
                <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default StyleSelector;
