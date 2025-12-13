"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function DemoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<null | {
    risk: "low" | "medium" | "high";
    matches: Array<{
      name: string;
      owner: string;
      similarity: number;
      classes: number[];
      register: string;
    }>;
  }>(null);

  const nizzaClasses = [
    { id: 9, name: "Software, Computer" },
    { id: 35, name: "Werbung, Geschäftsführung" },
    { id: 36, name: "Finanzwesen, Versicherungen" },
    { id: 41, name: "Ausbildung, Unterhaltung" },
    { id: 42, name: "IT-Dienstleistungen" },
    { id: 45, name: "Rechtsberatung" }
  ];

  const toggleClass = (id: number) => {
    setSelectedClasses(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setResults(null);

    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockResults = {
      risk: Math.random() > 0.6 ? "low" : Math.random() > 0.3 ? "medium" : "high" as "low" | "medium" | "high",
      matches: [
        {
          name: `${searchTerm.toUpperCase()} Solutions`,
          owner: "TechCorp GmbH",
          similarity: 85,
          classes: [9, 42],
          register: "DPMA"
        },
        {
          name: `${searchTerm} Pro`,
          owner: "Innovation AG",
          similarity: 72,
          classes: [35, 41],
          register: "EUIPO"
        },
        {
          name: `Smart${searchTerm}`,
          owner: "Digital Partners Ltd.",
          similarity: 65,
          classes: [9, 35, 42],
          register: "WIPO"
        }
      ]
    };

    setResults(mockResults);
    setIsSearching(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "high": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low": return CheckCircle;
      case "medium": return AlertTriangle;
      case "high": return XCircle;
      default: return CheckCircle;
    }
  };

  const getRiskText = (risk: string) => {
    switch (risk) {
      case "low": return "Geringes Risiko";
      case "medium": return "Mittleres Risiko";
      case "high": return "Hohes Risiko";
      default: return "Unbekannt";
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container text-center">
          <span className="s-badge mb-6">Demo</span>
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Testen Sie{" "}
            <span className="text-primary">TrademarkIQ</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Geben Sie Ihren gewünschten Markennamen ein und erleben Sie, 
            wie unsere KI potenzielle Kollisionen in Sekunden findet.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="s-container">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label htmlFor="trademark" className="block text-sm font-medium text-gray-700 mb-2">
                  Markenname eingeben
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="trademark"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="z.B. TechFlow, InnoVate, SmartBiz..."
                    className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nizza-Klassen auswählen (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {nizzaClasses.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        selectedClasses.includes(cls.id)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-700 border-gray-300 hover:border-primary"
                      }`}
                    >
                      {cls.id}: {cls.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!searchTerm.trim() || isSearching}
                className="s-button w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Recherche läuft...
                  </>
                ) : (
                  <>
                    Marke recherchieren
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>

            {results && (
              <div className="mt-12 space-y-6">
                <div className={`rounded-xl p-6 ${getRiskColor(results.risk)}`}>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const RiskIcon = getRiskIcon(results.risk);
                      return <RiskIcon className="w-8 h-8" />;
                    })()}
                    <div>
                      <h3 className="text-xl font-semibold">
                        {getRiskText(results.risk)}
                      </h3>
                      <p className="text-sm opacity-80">
                        {results.matches.length} ähnliche Marken gefunden
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Gefundene ähnliche Marken
                  </h3>
                  <div className="space-y-4">
                    {results.matches.map((match, index) => (
                      <div 
                        key={index}
                        className="bg-white rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{match.name}</h4>
                            <p className="text-sm text-gray-600">{match.owner}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {match.register}
                              </span>
                              {match.classes.map(c => (
                                <span key={c} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  Klasse {c}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-bold ${
                              match.similarity >= 80 ? "text-red-600" :
                              match.similarity >= 60 ? "text-yellow-600" : "text-green-600"
                            }`}>
                              {match.similarity}%
                            </span>
                            <p className="text-xs text-gray-500">Ähnlichkeit</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Detaillierten Bericht erhalten
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Registrieren Sie sich für einen vollständigen PDF-Bericht mit 
                    rechtlicher Einordnung und Handlungsempfehlungen.
                  </p>
                  <Link href="/preise" className="s-button">
                    Jetzt registrieren
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            )}

            {!results && !isSearching && (
              <div className="mt-12 bg-gray-50 rounded-xl p-8 text-center">
                <p className="text-gray-600 mb-4">
                  Dies ist eine Demo-Version. Die echte TrademarkIQ-Plattform durchsucht 
                  DPMA, EUIPO und WIPO in Echtzeit und liefert präzise Ergebnisse.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Phonetische Analyse
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Visuelle Vergleiche
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Semantische Suche
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
