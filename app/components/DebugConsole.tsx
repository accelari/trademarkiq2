"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Database,
  Code,
} from "lucide-react";

interface DebugStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "error";
  data?: any;
  duration?: number;
}

interface SimilarityDebug {
  trademark: string;
  apiAccuracy: number;
  ourPhonetic: number;
  ourVisual: number;
  ourCombined: number;
  included: boolean;
  explanation: string;
}

interface DebugConsoleProps {
  searchTerm: string;
  selectedCountry: string;
  selectedClasses: number[];
  onSearchComplete?: (results: any) => void;
}

export default function DebugConsole({ 
  searchTerm, 
  selectedCountry, 
  selectedClasses,
  onSearchComplete 
}: DebugConsoleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [similarityDebug, setSimilarityDebug] = useState<SimilarityDebug[]>([]);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [claudePrompt, setClaudePrompt] = useState<string>("");
  const [claudeResponse, setClaudeResponse] = useState<any>(null);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const updateStep = (id: string, updates: Partial<DebugStep>) => {
    setDebugSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDebugSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setRawApiResponse(null);
    setSimilarityDebug([]);
    setClaudePrompt("");
    setClaudeResponse(null);
    
    const steps: DebugStep[] = [
      { id: "strategy", title: "1. KI-Suchstrategie generieren", status: "pending" },
      { id: "offices", title: "2. Ämter-Strategie (National → WIPO → EUIPO)", status: "pending" },
      { id: "api", title: "3. tmsearch.ai API aufrufen", status: "pending" },
      { id: "similarity", title: "4. Eigene Ähnlichkeitsberechnung", status: "pending" },
      { id: "filter", title: "5. Ergebnisse filtern", status: "pending" },
      { id: "claude", title: "6. Claude-Analyse", status: "pending" },
      { id: "final", title: "7. Finale Ergebnisse", status: "pending" },
    ];
    setDebugSteps(steps);
    setExpandedSteps(new Set(["strategy", "offices", "api", "similarity", "filter", "claude", "final"]));

    try {
      updateStep("strategy", { status: "running" });
      const strategyStart = Date.now();
      
      const strategyRes = await fetch("/api/debug/search-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markenname: searchTerm, klassen: selectedClasses, laender: [selectedCountry] }),
      });
      const strategyData = await strategyRes.json();
      
      updateStep("strategy", { 
        status: "completed", 
        data: strategyData,
        duration: Date.now() - strategyStart
      });

      updateStep("offices", { status: "running" });
      const officesStart = Date.now();
      
      const firstApiRes = await fetch("/api/debug/tmsearch-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchTerm, offices: [selectedCountry] }),
      });
      const officesData = await firstApiRes.json();
      
      updateStep("offices", { 
        status: "completed", 
        data: {
          selectedCountry,
          searchStrategy: officesData.searchStrategy,
          summary: officesData.summary
        },
        duration: Date.now() - officesStart
      });

      updateStep("api", { status: "running" });
      const apiStart = Date.now();
      
      const searchTerms = strategyData.queryTerms || [searchTerm];
      const allResults: any[] = [];
      const officeBreakdown: Record<string, number> = {};
      
      for (const term of searchTerms.slice(0, 5)) {
        const apiRes = await fetch("/api/debug/tmsearch-raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: term, offices: [selectedCountry] }),
        });
        const apiData = await apiRes.json();
        if (apiData.results) {
          allResults.push(...apiData.results.map((r: any) => ({ ...r, searchTerm: term })));
        }
        if (apiData.officeResults) {
          for (const [office, data] of Object.entries(apiData.officeResults as Record<string, any>)) {
            officeBreakdown[office] = (officeBreakdown[office] || 0) + (data.found || 0);
          }
        }
      }
      
      setRawApiResponse({ 
        searchTerms, 
        totalResults: allResults.length,
        officeBreakdown,
        results: allResults 
      });
      
      updateStep("api", { 
        status: "completed", 
        data: { 
          searchTerms, 
          totalResults: allResults.length, 
          officeBreakdown,
          sampleResults: allResults.slice(0, 10) 
        },
        duration: Date.now() - apiStart
      });

      updateStep("similarity", { status: "running" });
      const simStart = Date.now();
      
      const simRes = await fetch("/api/debug/similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm, trademarks: allResults.slice(0, 50) }),
      });
      const simData = await simRes.json();
      setSimilarityDebug(simData.results || []);
      
      updateStep("similarity", { 
        status: "completed", 
        data: simData,
        duration: Date.now() - simStart
      });

      updateStep("filter", { status: "running" });
      const filterStart = Date.now();
      
      const included = simData.results?.filter((r: SimilarityDebug) => r.included) || [];
      const excluded = simData.results?.filter((r: SimilarityDebug) => !r.included) || [];
      
      updateStep("filter", { 
        status: "completed", 
        data: { included: included.length, excluded: excluded.length, threshold: "combined >= 50% OR coreWordMatch" },
        duration: Date.now() - filterStart
      });

      updateStep("claude", { status: "running" });
      const claudeStart = Date.now();
      
      const claudeRes = await fetch("/api/debug/claude-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          markenname: searchTerm, 
          results: included.slice(0, 20),
          searchTerms 
        }),
      });
      const claudeData = await claudeRes.json();
      setClaudePrompt(claudeData.prompt || "");
      setClaudeResponse(claudeData.response || null);
      
      updateStep("claude", { 
        status: "completed", 
        data: claudeData,
        duration: Date.now() - claudeStart
      });

      updateStep("final", { status: "completed", data: {
        totalAnalyzed: allResults.length,
        relevantConflicts: included.length,
        riskLevel: claudeData.response?.overallRisk || "unknown"
      }});

      if (onSearchComplete) {
        onSearchComplete({
          allResults,
          included,
          claudeAnalysis: claudeData.response
        });
      }

    } catch (error) {
      console.error("Debug search error:", error);
      const currentRunning = debugSteps.find(s => s.status === "running");
      if (currentRunning) {
        updateStep(currentRunning.id, { status: "error", data: { error: String(error) } });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIcon = (status: DebugStep["status"]) => {
    switch (status) {
      case "pending": return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
      case "running": return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error": return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const renderJson = (data: any) => (
    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Code className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Admin Debug-Konsole</h3>
        </div>
        <p className="text-sm text-purple-700 mb-4">
          Detaillierte Ansicht aller API-Aufrufe und KI-Verarbeitung für: <strong>{searchTerm || "(kein Suchbegriff)"}</strong>
        </p>
        <button
          onClick={handleDebugSearch}
          disabled={isLoading || !searchTerm.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Debug-Suche starten
        </button>
      </div>

      {debugSteps.length > 0 && (
        <div className="space-y-3">
          {debugSteps.map((step) => (
            <div key={step.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                {renderStepIcon(step.status)}
                <span className="font-medium text-gray-900 flex-1 text-left text-sm">{step.title}</span>
                {step.duration !== undefined && (
                  <span className="text-xs text-gray-500">{step.duration}ms</span>
                )}
                {expandedSteps.has(step.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {expandedSteps.has(step.id) && step.data && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3">
                    {step.id === "strategy" && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Generierte Suchbegriffe
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {step.data.queryTerms?.map((term: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                        {step.data.expertStrategy && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Strategie-Details</h4>
                            {renderJson(step.data.expertStrategy)}
                          </div>
                        )}
                      </div>
                    )}

                    {step.id === "offices" && step.data?.searchStrategy && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">
                            Suchstrategie für {step.data.searchStrategy.countryName || step.data.selectedCountry}
                          </h4>
                          <div className="flex gap-2 mb-2">
                            {step.data.searchStrategy.isWipoMember && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">WIPO-Mitglied</span>
                            )}
                            {step.data.searchStrategy.isEuMember && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">EU-Mitglied</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {step.data.searchStrategy.offices?.map((office: any, i: number) => (
                              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                                office.type === "national" ? "bg-white border border-gray-200" :
                                office.type === "wipo" ? "bg-blue-100/50 border border-blue-200" :
                                "bg-purple-100/50 border border-purple-200"
                              }`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                  office.type === "national" ? "bg-gray-600" :
                                  office.type === "wipo" ? "bg-blue-600" :
                                  "bg-purple-600"
                                }`}>
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-xs">{office.name} ({office.code})</div>
                                  <div className="text-xs text-gray-600">{office.reason}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {step.data.summary && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Ergebnisse pro Amt</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {step.data.summary.byOffice?.map((office: any, i: number) => (
                                <div key={i} className={`rounded-lg p-2 ${
                                  office.type === "national" ? "bg-gray-50" :
                                  office.type === "wipo" ? "bg-blue-50" :
                                  "bg-purple-50"
                                }`}>
                                  <div className="text-lg font-bold">{office.count}</div>
                                  <div className="text-xs font-medium">{office.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {step.id === "api" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xl font-bold text-blue-600">{step.data.searchTerms?.length || 0}</div>
                            <div className="text-xs text-blue-600">Suchbegriffe</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-xl font-bold text-green-600">{step.data.totalResults || 0}</div>
                            <div className="text-xs text-green-600">API-Treffer</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="text-xl font-bold text-purple-600">{selectedCountry}</div>
                            <div className="text-xs text-purple-600">Register</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Database className="w-3 h-3" /> Rohdaten (erste 10)
                          </h4>
                          {renderJson(step.data.sampleResults)}
                        </div>
                      </div>
                    )}
                    
                    {step.id === "similarity" && similarityDebug.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Ähnlichkeitsanalyse pro Marke</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-2 py-1 text-left">Marke</th>
                                <th className="px-2 py-1 text-center">API %</th>
                                <th className="px-2 py-1 text-center">Phonetik</th>
                                <th className="px-2 py-1 text-center">Visuell</th>
                                <th className="px-2 py-1 text-center">Gesamt</th>
                                <th className="px-2 py-1 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {similarityDebug.slice(0, 15).map((sim, i) => (
                                <tr key={i} className={`border-t ${sim.included ? "bg-green-50" : "bg-red-50/30"}`}>
                                  <td className="px-2 py-1 font-medium">{sim.trademark}</td>
                                  <td className="px-2 py-1 text-center">{sim.apiAccuracy}%</td>
                                  <td className="px-2 py-1 text-center">{sim.ourPhonetic}%</td>
                                  <td className="px-2 py-1 text-center">{sim.ourVisual}%</td>
                                  <td className="px-2 py-1 text-center font-bold">{sim.ourCombined}%</td>
                                  <td className="px-2 py-1 text-center">
                                    {sim.included ? (
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">OK</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">Aus</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {step.id === "filter" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-green-600">{step.data.included}</div>
                          <div className="text-xs text-green-600">Relevant</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-red-600">{step.data.excluded}</div>
                          <div className="text-xs text-red-600">Ausgeblendet</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-mono text-gray-600">{step.data.threshold}</div>
                          <div className="text-xs text-gray-500">Schwelle</div>
                        </div>
                      </div>
                    )}
                    
                    {step.id === "claude" && (
                      <div className="space-y-3">
                        {claudePrompt && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Claude Prompt</h4>
                            <pre className="bg-gray-100 p-3 rounded-lg text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {claudePrompt.substring(0, 2000)}...
                            </pre>
                          </div>
                        )}
                        {claudeResponse && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Claude Antwort</h4>
                            {renderJson(claudeResponse)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {step.id === "final" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-blue-600">{step.data.totalAnalyzed}</div>
                          <div className="text-xs text-blue-600">Analysiert</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-orange-600">{step.data.relevantConflicts}</div>
                          <div className="text-xs text-orange-600">Konflikte</div>
                        </div>
                        <div className={`rounded-lg p-3 ${
                          step.data.riskLevel === "high" ? "bg-red-50" :
                          step.data.riskLevel === "medium" ? "bg-orange-50" :
                          "bg-green-50"
                        }`}>
                          <div className={`text-xl font-bold ${
                            step.data.riskLevel === "high" ? "text-red-600" :
                            step.data.riskLevel === "medium" ? "text-orange-600" :
                            "text-green-600"
                          }`}>
                            {step.data.riskLevel === "high" ? "Hoch" :
                             step.data.riskLevel === "medium" ? "Mittel" :
                             step.data.riskLevel === "low" ? "Niedrig" : "?"}
                          </div>
                          <div className="text-xs text-gray-600">Risiko</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
