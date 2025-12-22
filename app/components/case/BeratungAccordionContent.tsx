"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Mic, 
  MessageSquare, 
  ArrowRight, 
  ChevronDown, 
  Info,
  Lightbulb,
  MessageCircle
} from "lucide-react";
import VoiceAssistant, { VoiceAssistantHandle } from "../VoiceAssistant";

interface Consultation {
  id: string;
  title: string;
  summary: string;
  duration: number | null;
  mode: string;
  createdAt: string;
  extractedData?: {
    trademarkName?: string;
    countries?: string[];
    niceClasses?: number[];
  };
}

interface CaseData {
  id: string;
  caseNumber: string;
  trademarkName: string | null;
  status: string;
  consultations: Consultation[];
}

interface BeratungAccordionContentProps {
  caseData: CaseData;
  accessToken: string;
  hasVoiceAssistant: boolean;
  onNavigateToRecherche?: () => void;
}

export default function BeratungAccordionContent({
  caseData,
  accessToken,
  hasVoiceAssistant,
  onNavigateToRecherche,
}: BeratungAccordionContentProps) {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);

  const latestConsultation = caseData.consultations[caseData.consultations.length - 1];
  const existingData = latestConsultation?.extractedData || {};

  const buildContextMessage = (): string | null => {
    if (caseData.consultations.length === 0) return null;

    let mergedCountries: string[] = [];
    let mergedNiceClasses: number[] = [];
    let allSummaries: { date: string; summary: string }[] = [];

    caseData.consultations.forEach((consultation) => {
      const extracted = consultation.extractedData;
      if (extracted?.countries) {
        mergedCountries = [...new Set([...mergedCountries, ...extracted.countries])];
      }
      if (extracted?.niceClasses) {
        mergedNiceClasses = [...new Set([...mergedNiceClasses, ...extracted.niceClasses])];
      }
      if (consultation.summary) {
        const consultationDate = new Date(consultation.createdAt).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        allSummaries.push({ date: consultationDate, summary: consultation.summary });
      }
    });

    const knownTrademarkName = caseData.trademarkName || existingData.trademarkName;
    const countries = mergedCountries.length > 0 ? mergedCountries : (existingData.countries || []);
    const niceClasses = mergedNiceClasses.length > 0 ? mergedNiceClasses : (existingData.niceClasses || []);

    const missingInfo: string[] = [];
    if (!knownTrademarkName) missingInfo.push("Markenname");
    if (countries.length === 0) missingInfo.push("Zielländer");
    if (niceClasses.length === 0) missingInfo.push("Nizza-Klassen");

    let systemContext = `[SYSTEM-KONTEXT]
Dies ist eine Fortsetzung einer Beratung für Fall ${caseData.caseNumber}.
Der Kunde hat bereits ${caseData.consultations.length} Beratungssession(s) mit dir geführt.`;

    if (allSummaries.length > 0) {
      systemContext += `

GESPRÄCHSVERLAUF (chronologisch):`;
      allSummaries.forEach((s, i) => {
        systemContext += `

--- Session ${i + 1} (${s.date}) ---
${s.summary}`;
      });
    }

    systemContext += `

AKTUELLER STAND:
- Markenname: ${knownTrademarkName || "(noch nicht festgelegt)"}
- Länder: ${countries.length > 0 ? countries.join(", ") : "(noch nicht festgelegt)"}
- Nizza-Klassen: ${niceClasses.length > 0 ? niceClasses.join(", ") : "(noch nicht festgelegt)"}`;

    if (missingInfo.length > 0) {
      systemContext += `

FEHLENDE INFORMATIONEN:
${missingInfo.map(info => `- ${info} muss noch bestimmt werden`).join("\n")}

Bitte begrüße den Kunden herzlich zurück und fasse kurz zusammen, was ihr bereits besprochen habt. Hilf dann, die fehlenden Informationen zu ergänzen.`;
    } else {
      systemContext += `

Alle wichtigen Informationen sind bereits vorhanden. Begrüße den Kunden herzlich zurück, fasse kurz zusammen was ihr besprochen habt, und frage ob er zur Recherche fortfahren oder weitere Details besprechen möchte.`;
    }

    return systemContext;
  };

  const contextMessage = buildContextMessage();

  const handleProceedToRecherche = () => {
    if (onNavigateToRecherche) {
      onNavigateToRecherche();
    } else {
      router.push(`/dashboard/recherche?caseId=${caseData.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 rounded-xl p-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Eingabemethode</span>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-500 cursor-help hover:text-gray-700 transition-colors" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                Wählen Sie, wie Sie mit dem Berater kommunizieren möchten.
              </div>
            </div>
          </div>
          <div className="flex bg-white rounded-lg p-1 w-fit border border-gray-200">
            <button
              onClick={() => setInputMode("sprache")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                inputMode === "sprache" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Mic className="w-4 h-4" />
              Sprechen
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                inputMode === "text" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Tippen
            </button>
          </div>
        </div>

        <button
          onClick={handleProceedToRecherche}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 shadow-md transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          Weiter zur Recherche
        </button>
      </div>

      {hasVoiceAssistant && accessToken ? (
        <VoiceProvider>
          <VoiceAssistant
            ref={voiceAssistantRef}
            accessToken={accessToken}
            inputMode={inputMode}
            contextMessage={contextMessage}
          />
        </VoiceProvider>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <MessageCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-amber-700 font-medium mb-2">
            Voice-Assistent nicht verfügbar
          </p>
          <p className="text-amber-600 text-sm">
            Die Sprachfunktion ist derzeit nicht aktiv. Bitte versuchen Sie es später erneut oder nutzen Sie die vollständige Beratungsseite.
          </p>
          <button
            onClick={() => router.push(`/dashboard/copilot?caseId=${caseData.id}`)}
            className="mt-4 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
          >
            Zur Beratungsseite
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-gray-900">So funktioniert's</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showHowItWorks ? "rotate-180" : ""}`} />
          </button>
          
          {showHowItWorks && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Klicken Sie auf <strong>"Starten"</strong> und stellen Sie Ihre Fragen zur Markenanmeldung.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Klaus hilft Ihnen, den <strong>Markennamen</strong>, <strong>Klassen</strong> und <strong>Länder</strong> festzulegen.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Klicken Sie auf <strong>"Weiter zur Recherche"</strong>, um die Markenprüfung zu starten.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {caseData.consultations.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Bisherige Beratungen ({caseData.consultations.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {caseData.consultations.slice(-3).reverse().map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{consultation.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(consultation.createdAt).toLocaleDateString("de-DE")}
                    {consultation.duration && ` • ${Math.round(consultation.duration / 60)} Min.`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
