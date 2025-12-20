"use client";

import { useState } from "react";
import { Search, Lightbulb, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface CheckedName {
  name: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  timestamp: Date;
}

interface ManualEntryTabProps {
  selectedClasses: number[];
  checkedNames: CheckedName[];
  isChecking: boolean;
  onQuickCheck: (name: string) => void;
}

export function ManualEntryTab({
  selectedClasses,
  checkedNames,
  isChecking,
  onQuickCheck,
}: ManualEntryTabProps) {
  const [nameInput, setNameInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onQuickCheck(nameInput.trim());
      setNameInput("");
    }
  };

  const getRiskConfig = (level: "low" | "medium" | "high") => {
    const configs = {
      low: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Niedriges Risiko" },
      medium: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50", label: "Mittleres Risiko" },
      high: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Hohes Risiko" },
    };
    return configs[level];
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Geben Sie Ihren Wunschnamen ein:
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="z.B. TechFlow, InnoVate, CloudPulse..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
            disabled={isChecking}
          />
        </div>

        <button
          type="submit"
          disabled={!nameInput.trim() || isChecking}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {isChecking ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Prüfe Register...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Quick-Check starten
            </>
          )}
        </button>
      </form>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 text-sm">Tipps für einen guten Markennamen:</p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Vermeiden Sie rein beschreibende Begriffe (z.B. "Schnell-Service")</li>
              <li>Prüfen Sie, ob die Domain verfügbar ist</li>
              <li>Achten Sie auf internationale Aussprache</li>
              <li>Phantasienamen haben die höchste Schutzfähigkeit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Checked Names History */}
      {checkedNames.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wider">
            Letzte Eingaben
          </h4>
          <div className="space-y-2">
            {checkedNames.slice(0, 5).map((checked) => {
              const config = getRiskConfig(checked.riskLevel);
              const Icon = config.icon;
              return (
                <div
                  key={`${checked.name}-${checked.timestamp.getTime()}`}
                  className={`${config.bg} border border-gray-200 rounded-lg p-3 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="font-medium text-gray-900">{checked.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      Score: {checked.riskScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualEntryTab;
