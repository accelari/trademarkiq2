"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlaybooks, useApplications } from "@/lib/hooks";
import { 
  ClipboardList, 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Calendar,
  Euro,
  Clock,
  Loader2,
  Plus,
  BarChart3,
  FileCheck2
} from "lucide-react";

const jurisdictions = [
  { id: "dpma", name: "DPMA", country: "Deutschland", flag: "🇩🇪", duration: "3-6 Monate", cost: "290€" },
  { id: "euipo", name: "EUIPO", country: "EU-weit", flag: "🇪🇺", duration: "4-6 Monate", cost: "850€" },
  { id: "wipo", name: "WIPO", country: "International", flag: "🌍", duration: "12-18 Monate", cost: "ab 653 CHF" },
];

const dpmaSteps = [
  {
    id: 1,
    title: "Markenrecherche durchführen",
    description: "Prüfen Sie, ob Ihre gewünschte Marke bereits existiert oder Konflikte verursachen könnte.",
    checklist: [
      "Identische Marken in der DPMA-Datenbank gesucht",
      "Ähnliche Marken geprüft",
      "Nizzaklassen identifiziert",
      "Kollisionsrisiko bewertet"
    ]
  },
  {
    id: 2,
    title: "Anmeldeunterlagen vorbereiten",
    description: "Sammeln Sie alle notwendigen Dokumente und Informationen für die Anmeldung.",
    checklist: [
      "Markenname/Logo finalisiert",
      "Waren- und Dienstleistungsverzeichnis erstellt",
      "Nizzaklassen ausgewählt (max. 3 in Grundgebühr)",
      "Anmelderdaten vollständig"
    ]
  },
  {
    id: 3,
    title: "Online-Anmeldung beim DPMA",
    description: "Reichen Sie Ihre Markenanmeldung elektronisch beim Deutschen Patent- und Markenamt ein.",
    checklist: [
      "DPMA-Konto erstellt",
      "Anmeldeformular ausgefüllt",
      "Waren-/Dienstleistungsverzeichnis eingegeben",
      "Gebühren bezahlt (290€ Grundgebühr)"
    ]
  },
  {
    id: 4,
    title: "Prüfungsphase abwarten",
    description: "Das DPMA prüft Ihre Anmeldung auf formale und absolute Schutzhindernisse.",
    checklist: [
      "Eingangsbestätigung erhalten",
      "Aktenzeichen notiert",
      "Prüfungsbescheid bearbeitet (falls vorhanden)",
      "Mängel behoben (falls erforderlich)"
    ]
  },
  {
    id: 5,
    title: "Eintragung & Überwachung",
    description: "Nach erfolgreicher Prüfung wird Ihre Marke eingetragen. Richten Sie eine Überwachung ein.",
    checklist: [
      "Eintragungsurkunde erhalten",
      "Marke in Watchlist aufgenommen",
      "Verlängerungsfrist notiert (10 Jahre)",
      "Markenüberwachung aktiviert"
    ]
  }
];

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Entwurf", color: "bg-gray-100 text-gray-700" },
  pending: { label: "Ausstehend", color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Eingereicht", color: "bg-blue-100 text-blue-700" },
  expert_review: { label: "Expertenprüfung", color: "bg-purple-100 text-purple-700" },
  approved: { label: "Genehmigt", color: "bg-green-100 text-green-700" },
  rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-700" },
};

export default function PlaybooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { playbooks, isLoading, mutate } = usePlaybooks();
  const { applications, isLoading: applicationsLoading } = useApplications();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [activePlaybook, setActivePlaybook] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (activePlaybook) {
      setCurrentStep(activePlaybook.currentStep || 1);
      setCompletedItems(new Set(activePlaybook.completedItems || []));
    }
  }, [activePlaybook]);

  if (status === "loading" || isLoading || applicationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeApplications = applications.filter((a: any) => 
    a.status === "draft" || a.status === "pending" || a.status === "submitted" || a.status === "expert_review"
  );
  const completedPlaybooks = playbooks.filter((p: any) => p.status === "completed");
  const activePlaybooks = playbooks.filter((p: any) => p.status === "in_progress");

  const startPlaybook = async (jurisdiction: string) => {
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurisdiction }),
      });

      if (res.ok) {
        const playbook = await res.json();
        setActivePlaybook(playbook);
        setSelectedJurisdiction(jurisdiction);
        mutate();
      }
    } catch (error) {
      console.error("Error creating playbook:", error);
    }
  };

  const toggleItem = async (stepId: number, itemIndex: number) => {
    const key = `${stepId}-${itemIndex}`;
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(key)) {
      newCompleted.delete(key);
    } else {
      newCompleted.add(key);
    }
    setCompletedItems(newCompleted);

    if (activePlaybook) {
      setSaving(true);
      try {
        await fetch(`/api/playbooks/${activePlaybook.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentStep,
            completedItems: Array.from(newCompleted),
          }),
        });
      } catch (error) {
        console.error("Error saving progress:", error);
      } finally {
        setSaving(false);
      }
    }
  };

  const isItemCompleted = (stepId: number, itemIndex: number) => {
    return completedItems.has(`${stepId}-${itemIndex}`);
  };

  const getStepProgress = (stepId: number) => {
    const step = dpmaSteps.find(s => s.id === stepId);
    if (!step) return 0;
    const completed = step.checklist.filter((_, idx) => isItemCompleted(stepId, idx)).length;
    return Math.round((completed / step.checklist.length) * 100);
  };

  const getCompletedStepsCount = () => {
    return dpmaSteps.filter(step => getStepProgress(step.id) === 100).length;
  };

  const getOverallProgress = () => {
    return Math.round((getCompletedStepsCount() / dpmaSteps.length) * 100);
  };

  const existingPlaybooks = playbooks.filter((p: any) => p.status === "in_progress");

  if (!selectedJurisdiction && !activePlaybook) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Anmeldungs-Playbooks</h1>
            <p className="text-gray-600 mt-1">
              Schritt-für-Schritt Anleitungen für Ihre Markenanmeldung
            </p>
          </div>
          <Link
            href="/dashboard/anmeldung"
            className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Neue Markenanmeldung starten
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{activePlaybooks.length}</p>
                <p className="text-sm text-gray-500">Aktive Playbooks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileCheck2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{completedPlaybooks.length}</p>
                <p className="text-sm text-gray-500">Abgeschlossene Playbooks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{activeApplications.length}</p>
                <p className="text-sm text-gray-500">Laufende Anmeldungen</p>
              </div>
            </div>
          </div>
        </div>

        {activeApplications.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Aktive Markenanmeldungen
            </h3>
            <div className="space-y-3">
              {activeApplications.map((app: any) => {
                const jurisdiction = jurisdictions.find(j => j.id === app.jurisdiction);
                const statusInfo = statusLabels[app.status] || { label: app.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <Link
                    key={app.id}
                    href={`/dashboard/anmeldung?id=${app.id}`}
                    className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{jurisdiction?.flag || "🏷️"}</span>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{app.markName || "Unbenannte Marke"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">
                            {jurisdiction?.name || "Keine Jurisdiktion"}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {new Date(app.createdAt).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {existingPlaybooks.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              Aktive Playbooks fortsetzen
            </h3>
            <div className="space-y-3">
              {existingPlaybooks.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlaybook(p);
                    setSelectedJurisdiction(p.jurisdiction);
                  }}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {jurisdictions.find(j => j.id === p.jurisdiction)?.flag}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        {jurisdictions.find(j => j.id === p.jurisdiction)?.name} Anmeldung
                      </p>
                      <p className="text-sm text-gray-500">
                        Schritt {p.currentStep} von 5 • Gestartet am {new Date(p.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {jurisdictions.map((j) => (
            <button
              key={j.id}
              onClick={() => startPlaybook(j.id)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all text-left group"
            >
              <div className="text-4xl mb-4">{j.flag}</div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {j.name}
              </h3>
              <p className="text-gray-500 text-sm mt-1">{j.country}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{j.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Euro className="w-4 h-4" />
                  <span>{j.cost}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Playbook starten <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Welche Behörde ist richtig für mich?</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">🇩🇪 DPMA</p>
              <p>Ideal für Unternehmen, die nur in Deutschland tätig sind.</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">🇪🇺 EUIPO</p>
              <p>Perfekt für EU-weiten Schutz mit einer einzigen Anmeldung.</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">🌍 WIPO</p>
              <p>Für internationalen Schutz in ausgewählten Ländern weltweit.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedJurisdictionData = jurisdictions.find(j => j.id === selectedJurisdiction);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setSelectedJurisdiction(null);
            setActivePlaybook(null);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <span>{selectedJurisdictionData?.flag}</span>
            {selectedJurisdictionData?.name} Anmeldung
          </h1>
          <p className="text-gray-600 mt-1">
            {selectedJurisdictionData?.country} • {selectedJurisdictionData?.duration} • {selectedJurisdictionData?.cost}
          </p>
        </div>
        {saving && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Speichern...
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-900">Gesamtfortschritt</span>
          </div>
          <span className="text-sm text-gray-600">
            {getCompletedStepsCount()} von {dpmaSteps.length} Schritten abgeschlossen
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${getOverallProgress()}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0%</span>
          <span className="font-medium text-primary">{getOverallProgress()}%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {dpmaSteps.map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              currentStep === step.id
                ? "bg-primary text-white"
                : getStepProgress(step.id) === 100
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {getStepProgress(step.id) === 100 ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium">
                {step.id}
              </span>
            )}
            <span className="text-sm font-medium hidden md:inline">{step.title}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {dpmaSteps.filter(s => s.id === currentStep).map((step) => (
            <div key={step.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Schritt {step.id}: {step.title}
                  </h2>
                  <p className="text-gray-600 mt-1">{step.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{getStepProgress(step.id)}%</span>
                  <p className="text-xs text-gray-500">abgeschlossen</p>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getStepProgress(step.id)}%` }}
                />
              </div>

              <div className="space-y-3">
                {step.checklist.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => toggleItem(step.id, index)}
                    className={`flex items-center gap-3 w-full p-4 rounded-lg border transition-all text-left ${
                      isItemCompleted(step.id, index)
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 hover:border-primary/30"
                    }`}
                  >
                    {isItemCompleted(step.id, index) ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      isItemCompleted(step.id, index) ? "text-green-700 line-through" : "text-gray-700"
                    }`}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Vorheriger Schritt
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(dpmaSteps.length, currentStep + 1))}
              disabled={currentStep === dpmaSteps.length}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Nächster Schritt
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Wichtige Fristen
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-orange-900">Antwortfrist Prüfungsbescheid</p>
                <p className="text-xs text-orange-700 mt-1">2 Monate nach Erhalt</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Widerspruchsfrist</p>
                <p className="text-xs text-blue-700 mt-1">3 Monate nach Veröffentlichung</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Markenverlängerung</p>
                <p className="text-xs text-gray-700 mt-1">10 Jahre nach Anmeldung</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Hilfreiche Links
            </h3>
            <div className="space-y-2">
              <a 
                href="https://www.dpma.de/marken/index.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-primary"
              >
                DPMA Markenportal
              </a>
              <a 
                href="https://www.dpma.de/marken/klassifikation/index.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-primary"
              >
                Nizzaklassen-Übersicht
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
