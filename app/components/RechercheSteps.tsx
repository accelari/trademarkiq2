"use client";

import { useState } from "react";
import { Check, Loader2, AlertCircle, Circle, X, Search, Filter, FileText, Brain, BarChart3, ArrowRight, Database, Sparkles, ChevronDown, ChevronRight } from "lucide-react";

type StepStatus = "pending" | "running" | "done" | "error";

export interface RechercheStep {
  id: string;
  name: string;
  status: StepStatus;
  payload?: unknown;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface RechercheStepsProps {
  steps: RechercheStep[];
  isRunning: boolean;
}

// Detaillierte Erklärungen für jeden Schritt
const stepExplanations: Record<string, {
  icon: React.ReactNode;
  title: string;
  description: string;
  whatHappens: string[];
  source: string;
  sourceIcon: "database" | "ai";
}> = {
  search: {
    icon: <Search className="w-5 h-5" />,
    title: "Markenrecherche in der Datenbank",
    description: "Wir durchsuchen die tmsearch.ai-Datenbank nach allen eingetragenen Marken, die deinem Markennamen ähnlich sind.",
    whatHappens: [
      "Dein Markenname wird an die API gesendet",
      "Die KI durchsucht Millionen eingetragener Marken weltweit",
      "Ähnliche Namen werden anhand von Schreibweise und Klang gefunden",
      "Alle potenziellen Treffer werden zurückgeliefert"
    ],
    source: "tmsearch.ai",
    sourceIcon: "database"
  },
  filter: {
    icon: <Filter className="w-5 h-5" />,
    title: "Relevante Ergebnisse filtern",
    description: "Aus allen gefundenen Marken filtern wir nur die heraus, die für deine Anmeldung relevant sind.",
    whatHappens: [
      "Nur Marken aus deinen gewählten Ländern werden behalten",
      "Nur Marken in deinen Nizza-Klassen werden berücksichtigt",
      "Nur aktive (LIVE) Marken werden einbezogen",
      "Irrelevante Treffer werden aussortiert"
    ],
    source: "Lokal",
    sourceIcon: "database"
  },
  details: {
    icon: <FileText className="w-5 h-5" />,
    title: "Markendetails abrufen",
    description: "Für jede relevante Marke laden wir detaillierte Informationen wie Inhaber, Klassenbeschreibung und Registriernummer.",
    whatHappens: [
      "Für jeden potenziellen Konflikt werden vollständige Daten abgerufen",
      "Inhaber-Informationen werden geladen",
      "Genaue Waren-/Dienstleistungsbeschreibungen werden geholt",
      "Registriernummern und Anmeldedaten werden ergänzt"
    ],
    source: "tmsearch.ai",
    sourceIcon: "database"
  },
  "ai-analysis": {
    icon: <Brain className="w-5 h-5" />,
    title: "KI-Konfliktanalyse",
    description: "Claude AI analysiert jede potenzielle Konfliktmarke und bewertet das Kollisionsrisiko basierend auf rechtlichen Kriterien.",
    whatHappens: [
      "Jede Marke wird einzeln von der KI analysiert",
      "Phonetische Ähnlichkeit: Klingt der Name ähnlich?",
      "Visuelle Ähnlichkeit: Sieht der Name ähnlich aus?",
      "Waren-Überschneidung: Sind die Produkte/Dienste ähnlich?",
      "Ein Risiko-Score (0-100%) wird berechnet"
    ],
    source: "Claude AI",
    sourceIcon: "ai"
  },
  summary: {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Gesamtbewertung erstellen",
    description: "Die KI fasst alle Einzelanalysen zusammen und gibt eine Empfehlung, ob die Marke angemeldet werden sollte.",
    whatHappens: [
      "Alle Einzelbewertungen werden zusammengeführt",
      "Ein Gesamt-Risikoscore wird berechnet",
      "GO / NO-GO / GO MIT ÄNDERUNG Empfehlung wird erstellt",
      "Alternative Strategien werden vorgeschlagen"
    ],
    source: "Claude AI",
    sourceIcon: "ai"
  }
};

function formatDuration(start?: number, end?: number): string {
  if (!start) return "";
  const endTime = end || Date.now();
  const ms = endTime - start;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Lesbare Zusammenfassung der Ergebnisse je nach Schritt
function ResultSummary({ stepId, result, payload }: { stepId: string; result: unknown; payload?: unknown }) {
  const r = result as Record<string, unknown>;
  const p = payload as Record<string, unknown> | undefined;
  
  // Schritt 1: TMSearch API
  if (stepId === "search") {
    const total = r.total as number | undefined;
    const liveCount = r.liveCount as number | undefined;
    const deadCount = r.deadCount as number | undefined;
    const topResults = r.topResults as Array<{ 
      name: string; 
      status: string; 
      accuracy?: string | number;
      register?: string;
      countries?: string[];
      classes?: string[];
    }> | undefined;
    const keyword = p?.keyword as string | undefined;
    
    // Nur die ersten 10 für die Tabelle, einzigartige Namen
    const displayResults = topResults?.slice(0, 10) || [];
    
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Suchergebnis für &quot;{keyword}&quot;</span>
          </div>
        </div>
        
        {/* Statistik-Karten */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{total || 0}</div>
            <div className="text-xs text-gray-600">Treffer gesamt</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{liveCount || 0}</div>
            <div className="text-xs text-gray-600">Aktiv (LIVE)</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-400">{deadCount || 0}</div>
            <div className="text-xs text-gray-600">Inaktiv (DEAD)</div>
          </div>
        </div>
        
        {/* Top-Treffer Tabelle */}
        {displayResults.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Top-Treffer (nach Ähnlichkeit)
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-center font-medium">Ähnlichkeit</th>
                    <th className="px-3 py-2 text-center font-medium">Register</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Länder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayResults.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          Number(item.accuracy || 0) >= 95 ? "bg-red-100 text-red-700" :
                          Number(item.accuracy || 0) >= 80 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {item.accuracy || "?"}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {item.register || "?"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "LIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[100px]">
                        {item.countries?.slice(0, 3).join(", ")}{(item.countries?.length || 0) > 3 ? "..." : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(topResults?.length || 0) > 10 && (
                <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                  ... und {(topResults?.length || 0) - 10} weitere Treffer
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Schritt 2: Filter
  if (stepId === "filter") {
    const before = r.before as number | undefined;
    const after = r.after as number | undefined;
    const countries = p?.countries as string[] | undefined;
    const classes = p?.classes as number[] | undefined;
    const removed = (before || 0) - (after || 0);
    
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-amber-900">Filter-Ergebnis</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-500">{before || 0}</div>
            <div className="text-xs text-gray-600">Vorher</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-500">-{removed}</div>
            <div className="text-xs text-gray-600">Aussortiert</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{after || 0}</div>
            <div className="text-xs text-gray-600">Relevant</div>
          </div>
        </div>
        <div className="text-sm text-gray-700 space-y-1">
          {countries && countries.length > 0 && (
            <div><span className="font-medium">Länder:</span> {countries.join(", ")}</div>
          )}
          {classes && classes.length > 0 && (
            <div><span className="font-medium">Klassen:</span> {classes.join(", ")}</div>
          )}
        </div>
      </div>
    );
  }
  
  // Schritt 3: Details laden
  if (stepId === "details") {
    const loaded = r.loaded as number | undefined;
    
    return (
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-indigo-900">Details geladen</span>
        </div>
        <div className="text-sm text-gray-700">
          Vollständige Informationen für <span className="font-bold text-indigo-600">{loaded || 0} Marken</span> abgerufen
          (Inhaber, Klassenbeschreibung, Registriernummer)
        </div>
      </div>
    );
  }
  
  // Schritt 4: AI Analyse
  if (stepId === "ai-analysis") {
    const analyzed = r.analyzed as number | undefined;
    
    return (
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-purple-900">KI-Analyse abgeschlossen</span>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-bold text-purple-600">{analyzed || 0} Marken</span> wurden einzeln auf Kollisionsrisiko analysiert
          (Phonetik, Visuell, Waren-Überschneidung)
        </div>
      </div>
    );
  }
  
  // Schritt 5: Zusammenfassung
  if (stepId === "summary") {
    const score = r.overallRiskScore as number | undefined;
    const level = r.overallRiskLevel as string | undefined;
    const decision = r.decision as string | undefined;
    const summary = r.executiveSummary as string | undefined;
    
    const riskColor = (score || 0) >= 70 ? "red" : (score || 0) >= 40 ? "amber" : "green";
    const decisionLabel = decision === "go" ? "✅ GO" : decision === "no_go" ? "❌ NO-GO" : "⚠️ GO MIT ÄNDERUNG";
    
    return (
      <div className={`p-4 bg-${riskColor}-50 border border-${riskColor}-200 rounded-xl space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">Gesamtbewertung</span>
          </div>
          <span className="text-lg font-bold">{decisionLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${(score || 0) >= 70 ? "text-red-600" : (score || 0) >= 40 ? "text-amber-600" : "text-green-600"}`}>
              {score || 0}%
            </div>
            <div className="text-xs text-gray-600">Risiko-Score</div>
          </div>
          <div className="flex-1 text-sm text-gray-700">
            {summary && summary.length > 200 ? summary.slice(0, 200) + "..." : summary}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

function StepDetailModal({ step, onClose }: { step: RechercheStep; onClose: () => void }) {
  const isRunning = step.status === "running";
  const explanation = stepExplanations[step.id];
  const [showRawData, setShowRawData] = useState(true);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] max-h-[95vh] overflow-hidden" style={{ zIndex: 10000 }}>
        {/* Header mit Gradient */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              {explanation?.icon || <Circle className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-semibold text-lg">{explanation?.title || step.name}</div>
              <div className="text-sm text-white/80 flex items-center gap-2">
                {step.status === "running" && <><Loader2 className="w-3 h-3 animate-spin" /> Läuft...</>}
                {step.status === "done" && <><Check className="w-3 h-3" /> Abgeschlossen</>}
                {step.status === "error" && <><AlertCircle className="w-3 h-3" /> Fehler</>}
                {step.startTime && <span className="ml-1">· {formatDuration(step.startTime, step.endTime)}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {explanation && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* Linke Spalte: Beschreibung + Datenfluss */}
              <div className="space-y-3">
                {/* Beschreibung */}
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <p className="text-sm text-teal-900 leading-relaxed">{explanation.description}</p>
                </div>
                
                {/* Datenfluss-Visualisierung */}
                <div className="flex items-center justify-center gap-3 py-3 bg-gray-50 rounded-xl">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                      <Search className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 font-medium">Anfrage</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                      explanation.sourceIcon === "ai" ? "bg-purple-100" : "bg-orange-100"
                    }`}>
                      {explanation.sourceIcon === "ai" ? (
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Database className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 font-medium">{explanation.source}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shadow-sm">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 font-medium">Ergebnis</span>
                  </div>
                </div>
                
                {/* Was passiert - Schritte */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was passiert?</div>
                  <div className="space-y-1.5">
                    {explanation.whatHappens.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="pt-0.5">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Rechte Spalte: Ergebnis (2 Spalten breit) */}
              <div className="lg:col-span-2">
                {step.result != null && (
                  <ResultSummary stepId={step.id} result={step.result} payload={step.payload} />
                )}
              </div>
            </div>
          )}
          
          {/* Fehler-Anzeige */}
          {step.error != null && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                <AlertCircle className="w-4 h-4" />
                Fehler aufgetreten
              </div>
              <div className="text-sm text-red-600">{String(step.error)}</div>
            </div>
          )}
          
          {/* Technische Details (collapsible) */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showRawData ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Technische Details (JSON)
            </button>
            
            {showRawData && (
              <div className="mt-3 space-y-3">
                {step.payload != null && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">📤 Request</div>
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                      {JSON.stringify(step.payload, null, 2)}
                    </pre>
                  </div>
                )}
                {isRunning && step.result == null && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">📥 Response</div>
                    <div className="text-xs bg-gray-900 text-teal-400 p-3 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Warte auf Antwort...</span>
                    </div>
                  </div>
                )}
                {step.result != null && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">📥 Response</div>
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ step, onClick, index, totalSteps }: { step: RechercheStep; onClick?: () => void; index: number; totalSteps: number }) {
  const statusConfig = {
    pending: { bg: "bg-gray-200", icon: <Circle className="w-2.5 h-2.5 text-gray-400" />, label: "Ausstehend" },
    running: { bg: "bg-teal-100 hover:bg-teal-200 cursor-pointer", icon: <Loader2 className="w-2.5 h-2.5 text-teal-600 animate-spin" />, label: "Läuft..." },
    done: { bg: "bg-green-100 hover:bg-green-200 cursor-pointer", icon: <Check className="w-2.5 h-2.5 text-green-600" />, label: "Abgeschlossen" },
    error: { bg: "bg-red-100 hover:bg-red-200 cursor-pointer", icon: <X className="w-2.5 h-2.5 text-red-600" />, label: "Fehler" },
  };

  const config = statusConfig[step.status];
  // Auch laufende Schritte sind klickbar
  const isClickable = step.status === "done" || step.status === "error" || step.status === "running";
  const duration = step.endTime ? formatDuration(step.startTime, step.endTime) : undefined;
  
  // Tooltip position: left-aligned for first items, right-aligned for last items to avoid cutoff
  const isLeftSide = index < totalSteps / 2;
  const tooltipPosition = isLeftSide ? "left-0" : "right-0";

  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        className={`w-5 h-5 rounded-full ${config.bg} flex items-center justify-center transition-all`}
      >
        {config.icon}
      </button>
      {/* Tooltip on hover - öffnet nach UNTEN um nicht abgeschnitten zu werden */}
      <div className={`absolute top-full ${tooltipPosition} mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`} style={{ minWidth: "180px" }}>
        <div className="font-semibold text-white">{step.name}</div>
        <div className="text-gray-400 mt-0.5">
          {config.label}{duration && ` · ${duration}`}
        </div>
        {isClickable && (
          <div className="text-teal-400 mt-1 text-[10px]">↓ Klick für Details</div>
        )}
      </div>
    </div>
  );
}

export function RechercheSteps({ steps, isRunning }: RechercheStepsProps) {
  const [selectedStep, setSelectedStep] = useState<RechercheStep | null>(null);
  
  if (steps.length === 0 && !isRunning) return null;

  const doneCount = steps.filter(s => s.status === "done").length;
  const hasError = steps.some(s => s.status === "error");
  const currentStep = steps.find(s => s.status === "running");

  return (
    <>
      <div className="flex items-center gap-3 px-1 py-1.5">
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <StepDot 
                step={step}
                onClick={() => setSelectedStep(step)}
                index={i}
                totalSteps={steps.length}
              />
              {i < steps.length - 1 && (
                <div className={`w-3 h-0.5 ${step.status === "done" ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Status text */}
        <span className="text-xs text-gray-600">
          {isRunning ? (
            <span className="text-teal-600">{currentStep?.name || "Läuft..."}</span>
          ) : hasError ? (
            <span className="text-red-600">Fehler</span>
          ) : (
            <span className="text-green-600">{doneCount}/{steps.length} ✓</span>
          )}
        </span>
      </div>

      {/* Detail Modal */}
      {selectedStep && (
        <StepDetailModal step={selectedStep} onClose={() => setSelectedStep(null)} />
      )}
    </>
  );
}

export default RechercheSteps;
