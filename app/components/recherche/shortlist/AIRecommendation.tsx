"use client";

import { Trophy, ArrowRight, Sparkles } from "lucide-react";

interface AIRecommendationProps {
  recommendedName: string;
  reasons: string[];
  onSelectRecommended: () => void;
}

export function AIRecommendation({
  recommendedName,
  reasons,
  onSelectRecommended,
}: AIRecommendationProps) {
  return (
    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-teal-50 border-2 border-primary/20 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                KI-Empfehlung
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              "{recommendedName}" ist die beste Wahl
            </h3>
            <ul className="space-y-2 mb-4">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold">
                    ✓
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onSelectRecommended}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
        >
          <span>Mit "{recommendedName}" zur Anmeldung</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default AIRecommendation;
