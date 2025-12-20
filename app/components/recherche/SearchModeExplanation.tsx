"use client";

import { Zap, Search, Clock, CheckCircle, AlertCircle, Brain, Ear, Eye, Lightbulb } from "lucide-react";

interface SearchModeExplanationProps {
  mode?: "quick" | "full";
  variant?: "card" | "inline" | "comparison";
}

export function SearchModeExplanation({ mode, variant = "comparison" }: SearchModeExplanationProps) {
  if (variant === "inline") {
    if (mode === "quick") {
      return (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <Zap className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-blue-900">Quick-Check</span>
            <span className="text-blue-700"> - Prüft nur exakte Namensübereinstimmungen. Gut für erste Einschätzung, findet aber keine ähnlich klingenden Namen.</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
        <Brain className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium text-purple-900">Vollanalyse</span>
          <span className="text-purple-700"> - KI generiert 8+ Suchvarianten und bewertet jeden Konflikt einzeln. Empfohlen vor Markenanmeldung.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Quick-Check */}
      <div className={`p-4 rounded-xl border-2 transition-all ${
        mode === "quick"
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Quick-Check</h4>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~1 Sekunde
            </span>
          </div>
        </div>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">Prüft exakte Namensübereinstimmungen</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">Gut für erste schnelle Einschätzung</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <span className="text-gray-600">Findet keine ähnlich klingenden Namen</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <span className="text-gray-600">Keine KI-Risikoanalyse</span>
          </li>
        </ul>
      </div>

      {/* Vollanalyse */}
      <div className={`p-4 rounded-xl border-2 transition-all ${
        mode === "full"
          ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Vollanalyse</h4>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~2 Minuten
            </span>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
            Empfohlen
          </span>
        </div>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">8+ Suchvarianten (phonetisch, visuell, Synonyme)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">KI bewertet jeden Konflikt einzeln</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">Rechtliche Einschätzung mit Begründung</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span className="text-gray-700">Alternative Namen-Vorschläge</span>
          </li>
        </ul>

        <div className="mt-3 pt-3 border-t border-purple-200">
          <p className="text-xs text-purple-700 font-medium">
            Suchvarianten-Typen:
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
              <Ear className="w-3 h-3" /> Phonetisch
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
              <Eye className="w-3 h-3" /> Visuell
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
              <Lightbulb className="w-3 h-3" /> Konzeptuell
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
              <Search className="w-3 h-3" /> Wortstamm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchModeHint({ mode }: { mode: "quick" | "full" }) {
  if (mode === "quick") {
    return (
      <p className="text-xs text-gray-500 mt-2">
        Tipp: Der Quick-Check findet nur exakte Übereinstimmungen.
        Für eine gründliche Prüfung vor der Anmeldung nutze die Vollanalyse.
      </p>
    );
  }
  return null;
}
