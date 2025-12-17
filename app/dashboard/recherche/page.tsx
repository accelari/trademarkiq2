"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import PrefillBanner from "@/app/components/PrefillBanner";
import DebugConsole from "@/app/components/DebugConsole";
import AIProcessOverview from "@/app/components/AIProcessOverview";
import ProgressTimeline, { ProgressStep, getInitialProgressSteps } from "@/app/components/ProgressTimeline";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Calendar,
  Building2,
  Tag,
  AlertTriangle,
  X,
  Loader2,
  Handshake,
  BarChart3,
  FilePlus,
  ArrowRight,
  Percent,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Check,
  Mail,
  Code,
  Eye,
  Lightbulb,
  HelpCircle,
  FolderOpen,
  Clock,
  Trash2,
  FileText,
  Brain,
  Star,
} from "lucide-react";
import WorkflowProgress from "@/app/components/WorkflowProgress";
import ConsultationsModal from "@/app/components/ConsultationsModal";
import { NICE_CLASSES, getPopularClasses, formatClassLabel } from "@/lib/nice-classes";
import { getAllRelatedClasses, hasOverlappingClasses, getClassRelationInfo } from "@/lib/related-classes";
import { useUnsavedData } from "@/app/contexts/UnsavedDataContext";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

const statusOptions = [
  { value: "all", label: "Alle Status" },
  { value: "active", label: "Aktiv" },
  { value: "expired", label: "Abgelaufen" },
];

const officeOptions = [
  { value: "all", label: "Alle Register" },
  { value: "DE", label: "DPMA (Deutschland)" },
  { value: "EU", label: "EUIPO (EU)" },
  { value: "WO", label: "WIPO (International)" },
  { value: "US", label: "USPTO (USA)" },
  { value: "GB", label: "UKIPO (UK)" },
  { value: "CH", label: "IGE (Schweiz)" },
  { value: "AT", label: "ÖPA (Österreich)" },
];

interface Trademark {
  id: string;
  mid: number;
  registrationNumber: string;
  applicationNumber: string;
  name: string;
  holder: string | null;
  holderAddress: string | null;
  holderCountry: string | null;
  status: string;
  statusOriginal: string;
  registrationDate: string | null;
  applicationDate: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  designationCountries: string[];
  niceClasses: number[];
  goodsServices: string | null;
  imageUrl: string | null;
  source: string;
  office: string;
  accuracy: number;
}

interface ConflictingMark {
  id: string;
  name: string;
  register: string;
  holder: string;
  classes: number[];
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
  status: string;
  applicationNumber: string;
  applicationDate: string | null;
  registrationNumber: string;
  registrationDate: string | null;
  isFamousMark: boolean;
}

interface SearchVariant {
  term: string;
  type: "exact" | "phonetic" | "visual" | "conceptual" | "root" | "misspelling";
  rationale: string;
}

interface ExpertStrategy {
  variants: SearchVariant[];
  strategyNarrative: string;
  classRisks: { classId: number; className: string; typicalConflicts: string; riskFocus: string }[];
  countryNotes: string;
}

interface AIAnalysis {
  success: boolean;
  analysis: {
    nameAnalysis: string;
    searchStrategy: string;
    riskAssessment: string;
    overallRisk: "high" | "medium" | "low";
    recommendation: string;
    famousMarkDetected: boolean;
    famousMarkNames: string[];
  };
  conflicts: ConflictingMark[];
  searchTermsUsed: string[];
  totalResultsAnalyzed: number;
  expertStrategy?: ExpertStrategy;
}

interface RiskModalProps {
  trademark: Trademark;
  onClose: () => void;
  onStartRegistration: (trademark: Trademark) => void;
}

function RiskCheckModal({ trademark, onClose, onStartRegistration }: RiskModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const riskLevel = trademark.accuracy >= 90 ? "high" : trademark.accuracy >= 80 ? "medium" : "low";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getRiskColor = () => {
    switch (riskLevel) {
      case "high": return { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", title: "text-red-800", text: "text-red-700" };
      case "medium": return { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600", title: "text-orange-800", text: "text-orange-700" };
      default: return { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", title: "text-green-800", text: "text-green-700" };
    }
  };

  const colors = getRiskColor();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Kollisionsrisiko-Prüfung</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">Prüfung für: <strong>{trademark.name}</strong></p>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-gray-600">Analysiere Kollisionsrisiken...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 ${colors.bg} border ${colors.border} rounded-xl`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 ${colors.icon} mt-0.5`} />
                  <div>
                    <h3 className={`font-semibold ${colors.title}`}>
                      {riskLevel === "high" ? "Hohes Kollisionsrisiko" : 
                       riskLevel === "medium" ? "Mittleres Kollisionsrisiko" : 
                       "Niedriges Kollisionsrisiko"}
                    </h3>
                    <p className={`text-sm ${colors.text} mt-1`}>
                      Die Marke "{trademark.name}" hat eine Ähnlichkeit von {trademark.accuracy}% zu Ihrer Suche.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Markendetails</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Register:</span>
                    <span className="font-medium">{trademark.office}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{trademark.status === "active" ? "Aktiv" : "Abgelaufen"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nizza-Klassen:</span>
                    <span className="font-medium">{trademark.niceClasses.join(", ")}</span>
                  </div>
                  {trademark.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ablaufdatum:</span>
                      <span className="font-medium">{new Date(trademark.expiryDate).toLocaleDateString("de-DE")}</span>
                    </div>
                  )}
                </div>
              </div>

              {trademark.status === "expired" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-700">
                    Diese Marke ist abgelaufen. Das Risiko einer Kollision ist daher geringer, 
                    aber eine rechtliche Beratung wird trotzdem empfohlen.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 space-y-3 flex-shrink-0">
          <button
            onClick={() => onStartRegistration(trademark)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            <FilePlus className="w-5 h-5" />
            Trotzdem anmelden
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="/dashboard/experten"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            <Handshake className="w-5 h-5" />
            Mit Experten sprechen
          </a>
          <p className="text-xs text-gray-500 text-center">
            Unsere Markenexperten helfen Ihnen bei der Risikobewertung
          </p>
        </div>
      </div>
    </div>
  );
}

interface DetailModalProps {
  trademark: Trademark;
  onClose: () => void;
}

function DetailModal({ trademark, onClose }: DetailModalProps) {
  const { data: details, isLoading, error } = useSWR(
    `/api/tmsearch/info?mid=${trademark.mid}`,
    fetcher
  );

  const tm = (details && !details.error) ? details : trademark;
  const niceClasses = Array.isArray(tm.niceClasses) ? tm.niceClasses : [];
  const designationCountries = Array.isArray(tm.designationCountries) ? tm.designationCountries : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {tm.imageUrl && (
                <img src={tm.imageUrl} alt={tm.name || "Marke"} className="w-16 h-16 object-contain rounded-lg border" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{tm.name || "Unbekannte Marke"}</h2>
                <p className="text-gray-600">{tm.office || "-"} - {tm.registrationNumber || tm.applicationNumber || "-"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center">
              <p>Details konnten nicht geladen werden.</p>
              <p className="text-sm mt-1">Die Basisdaten werden angezeigt.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-semibold">{tm.status === "active" ? "Aktiv" : tm.status === "expired" ? "Abgelaufen" : "Unbekannt"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Ähnlichkeit</p>
                  <p className="font-semibold text-primary">{tm.accuracy || 0}%</p>
                </div>
              </div>

              {tm.holder && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Inhaber</h3>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-medium">{tm.holder}</p>
                    {tm.holderAddress && <p className="text-sm text-gray-600 mt-1">{tm.holderAddress}</p>}
                    {tm.holderCountry && <p className="text-sm text-gray-500">{tm.holderCountry}</p>}
                  </div>
                </div>
              )}

              {niceClasses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Nizza-Klassen</h3>
                  <div className="flex flex-wrap gap-2">
                    {niceClasses.map((cls: number) => (
                      <span key={cls} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg">
                        Klasse {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tm.goodsServices && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Waren & Dienstleistungen</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">{tm.goodsServices}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Termine</h3>
                <div className="grid grid-cols-2 gap-3">
                  {tm.applicationDate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Anmeldedatum</p>
                      <p className="font-medium">{new Date(tm.applicationDate).toLocaleDateString("de-DE")}</p>
                    </div>
                  )}
                  {tm.registrationDate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Registrierung</p>
                      <p className="font-medium">{new Date(tm.registrationDate).toLocaleDateString("de-DE")}</p>
                    </div>
                  )}
                  {tm.expiryDate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Ablaufdatum</p>
                      <p className="font-medium">{new Date(tm.expiryDate).toLocaleDateString("de-DE")}</p>
                    </div>
                  )}
                  {tm.renewalDate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Verlängerung</p>
                      <p className="font-medium">{new Date(tm.renewalDate).toLocaleDateString("de-DE")}</p>
                    </div>
                  )}
                </div>
              </div>

              {designationCountries.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Schutzländer</h3>
                  <div className="flex flex-wrap gap-1">
                    {designationCountries.map((country: string) => (
                      <span key={country} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

interface NiceClassDropdownProps {
  selectedClasses: number[];
  onToggleClass: (classId: number) => void;
  onClearAll: () => void;
}

function NiceClassDropdown({ selectedClasses, onToggleClass, onClearAll }: NiceClassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allClassesSorted = [...NICE_CLASSES].sort((a, b) => a.id - b.id);

  const filterClasses = (classes: typeof NICE_CLASSES) => {
    if (!searchTerm) return classes;
    const term = searchTerm.toLowerCase();
    return classes.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.description.toLowerCase().includes(term) ||
      c.id.toString().includes(term)
    );
  };

  const filteredClasses = filterClasses(allClassesSorted);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-all text-left ${
          selectedClasses.length > 0
            ? "bg-primary/5 border-primary text-gray-800"
            : "bg-white border-gray-200 text-gray-700 hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-medium truncate">
            {selectedClasses.length === 45
              ? "Alle Klassen"
              : selectedClasses.length > 0 
              ? `${selectedClasses.length} Nizza-Klasse${selectedClasses.length > 1 ? 'n' : ''} ausgewählt`
              : "Nizza-Klassen auswählen"
            }
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedClasses.length === 45 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg">
              Alle Klassen
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                }}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : (
            <>
              {selectedClasses.map(classId => (
                <span
                  key={classId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg"
                >
                  Klasse {classId}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleClass(classId);
                    }}
                    className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedClasses.length > 1 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-sm text-primary hover:text-primary/80 font-medium px-2"
                >
                  Alle entfernen
                </button>
              )}
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Klasse suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          <div className="max-h-[320px] overflow-y-auto">
            {!searchTerm && (
              <label
                className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-gray-100 bg-gray-50/50"
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedClasses.length === 45 
                    ? 'bg-primary border-primary' 
                    : 'border-gray-300 hover:border-primary'
                }`}>
                  {selectedClasses.length === 45 && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedClasses.length === 45}
                  onChange={() => {
                    if (selectedClasses.length === 45) {
                      onClearAll();
                    } else {
                      allClassesSorted.forEach(c => {
                        if (!selectedClasses.includes(c.id)) {
                          onToggleClass(c.id);
                        }
                      });
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    Alle Klassen auswählen
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Alle 45 Nizza-Klassen auf einmal auswählen
                  </div>
                </div>
              </label>
            )}
            {filteredClasses.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wide">
                  Alle 45 Nizza-Klassen
                </div>
                {filteredClasses.map(niceClass => (
                  <label
                    key={niceClass.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedClasses.includes(niceClass.id) 
                        ? 'bg-primary border-primary' 
                        : 'border-gray-300 hover:border-primary'
                    }`}>
                      {selectedClasses.includes(niceClass.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedClasses.includes(niceClass.id)}
                      onChange={() => onToggleClass(niceClass.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        Klasse {niceClass.id} – {niceClass.name}
                        {niceClass.popular && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">beliebt</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {niceClass.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {filteredClasses.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>Keine Klassen gefunden für "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const laenderOptions = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "AF", label: "Afghanistan" },
  { value: "AG", label: "Antigua and Barbuda" },
  { value: "AL", label: "Albania" },
  { value: "AM", label: "Armenia" },
  { value: "AT", label: "Austria" },
  { value: "AU", label: "Australia" },
  { value: "AZ", label: "Azerbaijan" },
  { value: "BA", label: "Bosnia and Herzegovina" },
  { value: "BG", label: "Bulgaria" },
  { value: "BH", label: "Bahrain" },
  { value: "BN", label: "Brunei Darussalam" },
  { value: "BQ", label: "Bonaire, Sint Eustatius and Saba" },
  { value: "BR", label: "Brazil" },
  { value: "BT", label: "Bhutan" },
  { value: "BW", label: "Botswana" },
  { value: "BX", label: "Benelux" },
  { value: "BY", label: "Belarus" },
  { value: "BZ", label: "Belize" },
  { value: "CA", label: "Canada" },
  { value: "CH", label: "Switzerland" },
  { value: "CL", label: "Chile" },
  { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" },
  { value: "CU", label: "Cuba" },
  { value: "CV", label: "Cabo Verde" },
  { value: "CW", label: "Curaçao" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DE", label: "Germany" },
  { value: "DK", label: "Denmark" },
  { value: "DZ", label: "Algeria" },
  { value: "EE", label: "Estonia" },
  { value: "EG", label: "Egypt" },
  { value: "EM", label: "European Union" },
  { value: "ES", label: "Spain" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "GE", label: "Georgia" },
  { value: "GG", label: "Guernsey" },
  { value: "GH", label: "Ghana" },
  { value: "GM", label: "Gambia" },
  { value: "GR", label: "Greece" },
  { value: "HR", label: "Croatia" },
  { value: "HU", label: "Hungary" },
  { value: "ID", label: "Indonesia" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IN", label: "India" },
  { value: "IR", label: "Islamic Republic of Iran" },
  { value: "IS", label: "Iceland" },
  { value: "IT", label: "Italy" },
  { value: "JM", label: "Jamaica" },
  { value: "JP", label: "Japan" },
  { value: "KE", label: "Kenya" },
  { value: "KG", label: "Kyrgyzstan" },
  { value: "KH", label: "Cambodia" },
  { value: "KP", label: "Democratic People's Republic of Korea" },
  { value: "KR", label: "Republic of Korea" },
  { value: "KZ", label: "Kazakhstan" },
  { value: "LA", label: "Lao People's Democratic Republic" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LR", label: "Liberia" },
  { value: "LS", label: "Lesotho" },
  { value: "LT", label: "Lithuania" },
  { value: "LV", label: "Latvia" },
  { value: "MA", label: "Morocco" },
  { value: "MC", label: "Monaco" },
  { value: "MD", label: "Republic of Moldova" },
  { value: "ME", label: "Montenegro" },
  { value: "MG", label: "Madagascar" },
  { value: "MK", label: "The Republic of North Macedonia" },
  { value: "MN", label: "Mongolia" },
  { value: "MU", label: "Mauritius" },
  { value: "MW", label: "Malawi" },
  { value: "MX", label: "Mexico" },
  { value: "MY", label: "Malaysia" },
  { value: "MZ", label: "Mozambique" },
  { value: "NA", label: "Namibia" },
  { value: "NO", label: "Norway" },
  { value: "NZ", label: "New Zealand" },
  { value: "OA", label: "African Intellectual Property Organization (OAPI)" },
  { value: "OM", label: "Oman" },
  { value: "PH", label: "Philippines" },
  { value: "PK", label: "Pakistan" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "QA", label: "Qatar" },
  { value: "RO", label: "Romania" },
  { value: "RS", label: "Serbia" },
  { value: "RU", label: "Russian Federation" },
  { value: "RW", label: "Rwanda" },
  { value: "SD", label: "Sudan" },
  { value: "SE", label: "Sweden" },
  { value: "SG", label: "Singapore" },
  { value: "SI", label: "Slovenia" },
  { value: "SK", label: "Slovakia" },
  { value: "SL", label: "Sierra Leone" },
  { value: "SM", label: "San Marino" },
  { value: "ST", label: "Sao Tome and Principe" },
  { value: "SX", label: "Sint Maarten (Dutch part)" },
  { value: "SY", label: "Syrian Arab Republic" },
  { value: "SZ", label: "Eswatini" },
  { value: "TH", label: "Thailand" },
  { value: "TJ", label: "Tajikistan" },
  { value: "TM", label: "Turkmenistan" },
  { value: "TN", label: "Tunisia" },
  { value: "TR", label: "Türkiye" },
  { value: "TT", label: "Trinidad and Tobago" },
  { value: "UA", label: "Ukraine" },
  { value: "US", label: "United States of America" },
  { value: "UZ", label: "Uzbekistan" },
  { value: "VN", label: "Viet Nam" },
  { value: "WS", label: "Samoa" },
  { value: "ZM", label: "Zambia" },
  { value: "ZW", label: "Zimbabwe" },
];

interface LaenderDropdownProps {
  selectedLaender: string[];
  onToggleLand: (land: string) => void;
  onClearAll: () => void;
}

function LaenderDropdown({ selectedLaender, onToggleLand, onClearAll }: LaenderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLaender = laenderOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-all text-left ${
          selectedLaender.length > 0
            ? "bg-primary/5 border-primary text-gray-800"
            : "bg-white border-gray-200 text-gray-700 hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-medium truncate">
            {selectedLaender.length > 0 
              ? `${selectedLaender.length} ${selectedLaender.length === 1 ? 'Land' : 'Länder'} ausgewählt`
              : "Länder / Register auswählen"
            }
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedLaender.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedLaender.map(land => {
            const option = laenderOptions.find(o => o.value === land);
            return (
              <span
                key={land}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg"
              >
                {option?.label || land}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLand(land);
                  }}
                  className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
          {selectedLaender.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm text-primary hover:text-primary/80 font-medium px-2"
            >
              Alle entfernen
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Land suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredLaender.length > 0 ? (
              filteredLaender.map(option => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedLaender.includes(option.value) 
                      ? 'bg-primary border-primary' 
                      : 'border-gray-300 hover:border-primary'
                  }`}>
                    {selectedLaender.includes(option.value) && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedLaender.includes(option.value)}
                    onChange={() => onToggleLand(option.value)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      {option.value} - {option.label}
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Keine Länder gefunden für "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Minimalist Progress Indicator Component - synced with real API progress
interface MinimalProgressProps {
  progress: {
    step1: "pending" | "started" | "completed";
    step2: "pending" | "started" | "completed";
    step3: "pending" | "started" | "completed";
    step4: "pending" | "started" | "completed";
    step1Data?: { queryTerms?: string[] };
    step3Data?: { resultsCount?: number };
    currentMessage?: string;
    lastActivity?: number;
    searchDetails?: { termIndex: number; totalTerms: number; resultsFound: number };
  };
  searchTerm: string;
  onCancel?: () => void;
  startTime?: number;
}

function MinimalProgressIndicator({ progress, searchTerm, onCancel, startTime }: MinimalProgressProps) {
  const [currentTypingStep, setCurrentTypingStep] = useState("");
  const [completedStepsInPhase, setCompletedStepsInPhase] = useState<Record<number, string[]>>({0: [], 1: [], 2: [], 3: []});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  
  const phases = [
    {
      title: "Namensanalyse",
      icon: "search",
      progressKey: "step1" as const,
      steps: [
        `Analysiere "${searchTerm}"`,
        "Identifiziere phonetische Muster",
        "Prüfe Sprach-Varianten",
      ]
    },
    {
      title: "Suchstrategie",
      icon: "strategy",
      progressKey: "step2" as const,
      steps: [
        "Generiere Schreibweisen-Varianten",
        "Erstelle phonetische Varianten",
        "Kombiniere Suchbegriffe",
      ]
    },
    {
      title: "Registersuche",
      icon: "database",
      progressKey: "step3" as const,
      steps: [
        "Durchsuche nationale Register",
        "Durchsuche EUIPO & WIPO",
        "Prüfe internationale Marken",
      ]
    },
    {
      title: "Konfliktanalyse",
      icon: "analysis",
      progressKey: "step4" as const,
      steps: [
        "Berechne Ähnlichkeitswerte",
        "Identifiziere Konflikte",
        "Erstelle Zusammenfassung",
      ]
    }
  ];

  // Timer for elapsed time
  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  
  // Idle watchdog - track seconds since last activity
  useEffect(() => {
    const timer = setInterval(() => {
      if (progress.lastActivity) {
        const secondsSinceActivity = Math.floor((Date.now() - progress.lastActivity) / 1000);
        setIdleSeconds(secondsSinceActivity);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [progress.lastActivity]);
  
  // Reset idle counter when lastActivity changes
  useEffect(() => {
    setIdleSeconds(0);
  }, [progress.lastActivity]);

  // Calculate current phase based on real progress
  const getCurrentPhase = () => {
    if (progress.step4 === "started" || progress.step4 === "completed") return 3;
    if (progress.step3 === "started" || progress.step3 === "completed") return 2;
    if (progress.step2 === "started" || progress.step2 === "completed") return 1;
    return 0;
  };
  
  const currentPhase = getCurrentPhase();
  
  // Animate steps within each active phase
  useEffect(() => {
    const phase = phases[currentPhase];
    if (!phase) return;
    
    const phaseStatus = progress[phase.progressKey];
    if (phaseStatus === "pending") return;
    
    let stepIndex = completedStepsInPhase[currentPhase]?.length || 0;
    let charIndex = 0;
    
    if (phaseStatus === "completed") {
      setCompletedStepsInPhase(prev => ({
        ...prev,
        [currentPhase]: phase.steps
      }));
      setCurrentTypingStep("");
      return;
    }
    
    if (stepIndex >= phase.steps.length) return;
    
    const interval = setInterval(() => {
      const currentStep = phase.steps[stepIndex];
      if (!currentStep) {
        clearInterval(interval);
        return;
      }
      
      if (charIndex < currentStep.length) {
        setCurrentTypingStep(currentStep.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setCompletedStepsInPhase(prev => ({
          ...prev,
          [currentPhase]: [...(prev[currentPhase] || []), currentStep]
        }));
        setCurrentTypingStep("");
        charIndex = 0;
        stepIndex++;
      }
    }, 40);
    
    return () => clearInterval(interval);
  }, [currentPhase, progress.step1, progress.step2, progress.step3, progress.step4]);
  
  const getPhaseIcon = (icon: string) => {
    switch(icon) {
      case "search": return <Search className="w-4 h-4" />;
      case "strategy": return <Lightbulb className="w-4 h-4" />;
      case "database": return <Globe className="w-4 h-4" />;
      case "analysis": return <Brain className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };
  
  const isPhaseComplete = (phaseIdx: number) => {
    const phase = phases[phaseIdx];
    return progress[phase.progressKey] === "completed";
  };
  
  const isPhaseActive = (phaseIdx: number) => {
    const phase = phases[phaseIdx];
    return progress[phase.progressKey] === "started";
  };

  const isPhasePending = (phaseIdx: number) => {
    const phase = phases[phaseIdx];
    return progress[phase.progressKey] === "pending";
  };

  // Calculate stats from actual progress data
  const variants = progress.step1Data?.queryTerms?.length || (isPhaseComplete(1) ? 8 : currentPhase >= 1 ? Math.min(8, (completedStepsInPhase[1]?.length || 0) * 3) : 0);
  const searchProgress = progress.searchDetails;
  const registers = searchProgress?.termIndex || (isPhaseComplete(2) ? progress.step1Data?.queryTerms?.length || 8 : currentPhase >= 2 ? Math.min(5, (completedStepsInPhase[2]?.length || 0) * 2) : 0);
  const matches = searchProgress?.resultsFound || progress.step3Data?.resultsCount || (isPhaseComplete(2) ? 50 : 0);

  const estimatedTotal = 20;
  const remainingTime = Math.max(0, estimatedTotal - elapsedTime);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className={`w-5 h-5 text-primary ${idleSeconds < 12 ? 'animate-pulse' : 'animate-bounce'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Markenrecherche für "{searchTerm}"</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-primary truncate max-w-[300px]">
                {progress.currentMessage || "KI analysiert..."}
              </p>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {elapsedTime > 0 && `${elapsedTime}s`}
              </span>
            </div>
            {idleSeconds >= 12 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Warten auf tmsearch.ai-Antwort...
              </p>
            )}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Suche abbrechen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Live Stats with better labels */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">{variants}</p>
            <p className="text-xs text-gray-500">Schreibweisen</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">
              {searchProgress ? `${searchProgress.termIndex}/${searchProgress.totalTerms}` : registers}
            </p>
            <p className="text-xs text-gray-500">Suchen</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">{matches}</p>
            <p className="text-xs text-gray-500">Treffer</p>
          </div>
        </div>
        
        {/* Search progress bar during step 3 */}
        {progress.step3 === "started" && searchProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Registersuche</span>
              <span>{Math.round((searchProgress.termIndex / searchProgress.totalTerms) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(searchProgress.termIndex / searchProgress.totalTerms) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Phases synced with real progress */}
        <div className="space-y-3">
          {phases.map((phase, phaseIdx) => (
            <div 
              key={phaseIdx}
              className={`rounded-lg border transition-all ${
                isPhaseComplete(phaseIdx) 
                  ? "border-primary/30 bg-primary/5" 
                  : isPhaseActive(phaseIdx)
                    ? "border-primary/50 bg-white"
                    : "border-gray-100 bg-gray-50/50 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isPhaseComplete(phaseIdx) 
                    ? "bg-primary text-white" 
                    : isPhaseActive(phaseIdx)
                      ? "bg-primary/20 text-primary"
                      : "bg-gray-200 text-gray-400"
                }`}>
                  {isPhaseComplete(phaseIdx) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    getPhaseIcon(phase.icon)
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isPhaseComplete(phaseIdx) || isPhaseActive(phaseIdx)
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}>{phase.title}</span>
                {isPhaseActive(phaseIdx) && (
                  <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />
                )}
              </div>
              
              {isPhaseActive(phaseIdx) && (
                <div className="px-3 pb-3 pt-0">
                  <div className="pl-8 space-y-1 text-sm font-mono">
                    {phase.steps.map((step, stepIdx) => {
                      const phaseCompleted = completedStepsInPhase[phaseIdx] || [];
                      const isCompleted = phaseCompleted.includes(step);
                      const isTyping = currentTypingStep && 
                        step.startsWith(currentTypingStep.slice(0, 5)) && 
                        !isCompleted;
                      
                      if (!isCompleted && !isTyping) return null;
                      
                      return (
                        <div key={stepIdx} className={`flex items-start gap-2 ${
                          isCompleted ? "text-gray-400" : "text-gray-700"
                        }`}>
                          {isCompleted ? (
                            <Check className="w-3 h-3 mt-1 text-primary flex-shrink-0" />
                          ) : (
                            <Loader2 className="w-3 h-3 mt-1 text-primary animate-spin flex-shrink-0" />
                          )}
                          <span>
                            {isTyping ? currentTypingStep : step}
                            {isTyping && <span className="animate-pulse text-primary">|</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThinkingStepProps {
  step: number;
  text: string;
  status: "pending" | "started" | "completed";
  extraInfo?: string;
}

function ThinkingStep({ step, text, status, extraInfo }: ThinkingStepProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (status === "pending") {
      setDisplayText("");
      return;
    }
    
    if (status === "started" || status === "completed") {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 15);
      return () => clearInterval(typeInterval);
    }
  }, [status, text]);

  if (status === "pending") return null;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
        status === "completed" ? "bg-green-100" : "bg-primary/10"
      }`}>
        {status === "completed" ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <span className="text-xs font-semibold text-primary">{step}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${status === "completed" ? "text-gray-500" : "text-gray-700"}`}>
          {displayText}
          {status === "started" && displayText.length < text.length && (
            <span className="inline-block w-1 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          )}
        </p>
        {extraInfo && status === "completed" && (
          <p className="text-xs text-green-600 mt-0.5 font-medium">{extraInfo}</p>
        )}
      </div>
      {status === "started" && displayText.length === text.length && (
        <div className="flex-shrink-0">
          <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
        </div>
      )}
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

interface ConflictDetailModalProps {
  conflict: ConflictingMark;
  onClose: () => void;
  selectedClasses?: number[];
}

function ConflictDetailModal({ conflict, onClose, selectedClasses = [] }: ConflictDetailModalProps) {
  const getRiskStyles = () => {
    switch (conflict.riskLevel) {
      case "high": return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", icon: "text-red-600" };
      case "medium": return { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", icon: "text-orange-600" };
      case "low": return { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", icon: "text-green-600" };
    }
  };
  
  const formatGermanDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "-";
    }
  };
  
  const styles = getRiskStyles();
  const riskEmoji = conflict.riskLevel === "high" ? "🔴" : conflict.riskLevel === "medium" ? "🟡" : "🟢";
  const riskLabel = conflict.riskLevel === "high" ? "Hohes Risiko" : conflict.riskLevel === "medium" ? "Mittleres Risiko" : "Niedriges Risiko";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${styles.badge}`}>
                  {riskEmoji} {riskLabel}
                </span>
                <span className={`px-2 py-1 bg-white/80 rounded-full text-sm font-bold ${styles.icon}`}>
                  {conflict.accuracy}%
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{conflict.name}</h2>
              <p className="text-gray-600 mt-1">{conflict.holder}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Globe className="w-3.5 h-3.5" />
                Register
              </div>
              <p className="font-semibold text-gray-900">{conflict.register}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                Status
              </div>
              <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${conflict.status === "active" ? "bg-green-100 text-green-700" : conflict.status === "expired" ? "bg-gray-200 text-gray-600" : "bg-gray-200 text-gray-600"}`}>
                {conflict.status === "active" ? "Aktiv" : conflict.status === "expired" ? "Abgelaufen" : "Unbekannt"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Anmeldenummer</div>
              <p className="font-semibold text-gray-900">{conflict.applicationNumber || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Anmeldedatum</div>
              <p className="font-semibold text-gray-900">{formatGermanDate(conflict.applicationDate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Registrierungsnummer</div>
              <p className="font-semibold text-gray-900">{conflict.registrationNumber || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Registrierungsdatum</div>
              <p className="font-semibold text-gray-900">{formatGermanDate(conflict.registrationDate)}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Percent className="w-3.5 h-3.5" />
              Ähnlichkeit
            </div>
            <p className={`font-bold ${conflict.accuracy >= 90 ? 'text-red-600' : conflict.accuracy >= 80 ? 'text-orange-600' : 'text-green-600'}`}>
              {conflict.accuracy}%
            </p>
          </div>

          {conflict.holder && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Building2 className="w-3.5 h-3.5" />
                Inhaber
              </div>
              <p className="font-semibold text-gray-900">{conflict.holder}</p>
            </div>
          )}

          {conflict.classes && conflict.classes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Nizza-Klassen
              </h3>
              <div className="flex flex-wrap gap-2">
                {conflict.classes.map((cls) => {
                  const relationInfo = selectedClasses.length > 0 ? getClassRelationInfo(selectedClasses, cls) : null;
                  const isDirectMatch = relationInfo?.isDirectMatch;
                  const isRelated = relationInfo?.isRelated;
                  
                  return (
                    <div key={cls} className="flex flex-col gap-1">
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        isDirectMatch ? 'bg-primary/10 text-primary' :
                        isRelated ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Klasse {cls}
                        {isDirectMatch && <span className="ml-1 text-xs">(direkt)</span>}
                        {isRelated && <span className="ml-1 text-xs">(verwandt)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              {selectedClasses.length > 0 && conflict.classes.some(cls => {
                const info = getClassRelationInfo(selectedClasses, cls);
                return info.isRelated;
              }) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4" />
                    Verwandtschaftsgrund:
                  </p>
                  {conflict.classes.map(cls => {
                    const info = getClassRelationInfo(selectedClasses, cls);
                    if (info.isRelated && info.reason) {
                      return (
                        <p key={cls} className="text-xs text-yellow-700 mt-1">
                          <strong>Klasse {cls}:</strong> {info.reason}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${styles.icon}`} />
              Begründung
            </h3>
            <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
              <p className="text-gray-700 leading-relaxed">{conflict.reasoning}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

interface PrefillData {
  trademarkName: string | null;
  trademarkNames: string[];
  countries: string[];
  niceClasses: number[];
  source: "consultation" | "previous_search";
  date?: string;
  missingFields?: string[];
}

export default function RecherchePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedOffice, setSelectedOffice] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showClassFilter, setShowClassFilter] = useState(false);
  const [riskCheckTrademark, setRiskCheckTrademark] = useState<Trademark | null>(null);
  const [detailTrademark, setDetailTrademark] = useState<Trademark | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<ConflictingMark | null>(null);
  const limit = 10;

  const [aiSelectedClasses, setAiSelectedClasses] = useState<number[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStartTime, setAiStartTime] = useState<number | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const analysisCache = useRef<Map<string, AIAnalysis>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const [aiProgress, setAiProgress] = useState<{
    step1: "pending" | "started" | "completed";
    step2: "pending" | "started" | "completed";
    step3: "pending" | "started" | "completed";
    step4: "pending" | "started" | "completed";
    step1Data?: { queryTerms?: string[] };
    step3Data?: { resultsCount?: number };
    currentMessage?: string;
    lastActivity?: number;
    searchDetails?: { termIndex: number; totalTerms: number; resultsFound: number };
  }>({
    step1: "pending",
    step2: "pending",
    step3: "pending",
    step4: "pending",
  });
  
  const [selectedLaender, setSelectedLaender] = useState<string[]>([]);
  const [extendedClassSearch, setExtendedClassSearch] = useState(false);
  
  const [expertLoading, setExpertLoading] = useState(false);
  const [expertSuccess, setExpertSuccess] = useState(false);
  const [expertError, setExpertError] = useState<string | null>(null);
  
  const [showSuccessPopup, setShowSuccessPopup] = useState<'recherche' | 'expert' | null>(null);
  const [statusUpdated, setStatusUpdated] = useState(false);
  
  const [adminTab, setAdminTab] = useState<'user' | 'debug'>('user');
  const isAdmin = (session?.user as any)?.isAdmin === true;
  
  const [widgetPopup, setWidgetPopup] = useState<'conflicts' | 'analyzed' | 'variants' | null>(null);
  
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [currentCaseNumber, setCurrentCaseNumber] = useState<string | null>(null);
  
  const [showConsultationsModal, setShowConsultationsModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const caseCreatedRef = useRef(false);
  
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [resultsSaved, setResultsSaved] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  const hasUnsavedData = aiAnalysis !== null && !resultsSaved;
  
  const { 
    setHasUnsavedData: setGlobalHasUnsavedData, 
    setOnSaveBeforeLeave 
  } = useUnsavedData();

  useEffect(() => {
    setGlobalHasUnsavedData(hasUnsavedData);
  }, [hasUnsavedData, setGlobalHasUnsavedData]);

  useEffect(() => {
    const saveBeforeLeave = async () => {
      const activeCaseId = caseId || currentCaseNumber;
      
      if (activeCaseId) {
        try {
          await fetch(`/api/cases/${activeCaseId}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "recherche",
              status: "completed",
              metadata: {
                searchQuery: activeSearchQuery || searchQuery,
                resultsCount: aiAnalysis?.totalResultsAnalyzed || 0,
                conflictsCount: aiAnalysis?.conflicts?.length || 0,
                countries: selectedLaender,
                classes: aiSelectedClasses,
                searchedAt: new Date().toISOString(),
                aiAnalysis: aiAnalysis ? {
                  overallRisk: aiAnalysis.analysis?.overallRisk,
                  recommendation: aiAnalysis.analysis?.recommendation,
                  conflictsCount: aiAnalysis.conflicts?.length || 0,
                } : null,
              }
            })
          });
          setResultsSaved(true);
          setStatusUpdated(true);
        } catch (error) {
          console.error("Error saving results:", error);
        }
      } else {
        try {
          const response = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trademarkName: searchQuery,
              skipBeratung: true,
              completeRecherche: true,
              searchData: {
                query: searchQuery,
                countries: selectedLaender,
                classes: aiSelectedClasses,
                conflictsCount: aiAnalysis?.conflicts?.length || 0,
                totalAnalyzed: aiAnalysis?.totalResultsAnalyzed || 0,
              },
            }),
          });
          
          if (response.ok) {
            const caseData = await response.json();
            setCurrentCaseNumber(caseData.case?.caseNumber || caseData.case?.id);
            setResultsSaved(true);
          }
        } catch (error) {
          console.error("Error creating case:", error);
        }
      }
    };

    if (hasUnsavedData) {
      setOnSaveBeforeLeave(saveBeforeLeave);
    } else {
      setOnSaveBeforeLeave(null);
    }
    
    return () => {
      setOnSaveBeforeLeave(null);
    };
  }, [hasUnsavedData, caseId, currentCaseNumber, activeSearchQuery, searchQuery, aiAnalysis, selectedLaender, aiSelectedClasses, setOnSaveBeforeLeave]);
  
  const { data: consultationsData, mutate: mutateConsultations } = useSWR(
    session?.user?.id ? "/api/consultations" : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  const consultations = consultationsData?.consultations || [];
  
  const handleOpenConsultationsModal = useCallback(() => {
    mutateConsultations();
    setShowConsultationsModal(true);
  }, [mutateConsultations]);

  const handleDeleteConsultation = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      let endpoint: string;
      if (id.startsWith("case-")) {
        const caseId = id.replace("case-", "");
        endpoint = `/api/cases/${caseId}`;
      } else {
        endpoint = `/api/consultations/${id}`;
      }
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        mutateConsultations();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  }, [mutateConsultations]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!aiStartTime || !aiLoading) {
      setElapsedTime(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - aiStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [aiStartTime, aiLoading]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData) {
        e.preventDefault();
        e.returnValue = "Sie haben ungespeicherte Recherche-Ergebnisse. Möchten Sie die Seite wirklich verlassen?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedData]);

  useEffect(() => {
    if (caseId && !prefillApplied) {
      setPrefillLoading(true);
      fetch(`/api/cases/${caseId}/prefill`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.prefill) {
            const prefill = data.prefill;
            
            const missingFields: string[] = [];
            const hasTrademarkName = prefill.trademarkNames?.length > 0 || prefill.trademarkName;
            const hasCountries = prefill.countries?.length > 0;
            const hasNiceClasses = prefill.niceClasses?.length > 0;
            
            if (!hasTrademarkName) missingFields.push("Markenname");
            if (!hasCountries) missingFields.push("Länder");
            if (!hasNiceClasses) missingFields.push("Nizza-Klassen");
            
            setPrefillData({
              trademarkName: prefill.trademarkName,
              trademarkNames: prefill.trademarkNames || [],
              countries: prefill.countries || [],
              niceClasses: prefill.niceClasses || [],
              source: "consultation",
              date: data.decisions?.[0]?.extractedAt
                ? new Date(data.decisions[0].extractedAt).toLocaleDateString("de-DE")
                : undefined,
              missingFields: missingFields.length > 0 ? missingFields : undefined,
            });

            if (prefill.trademarkNames?.length > 0) {
              setSearchQuery(prefill.trademarkNames[0]);
            } else if (prefill.trademarkName) {
              setSearchQuery(prefill.trademarkName);
            }

            if (prefill.countries?.length > 0) {
              const countryCodeMap: Record<string, string> = {
                "USA": "US", "UNITED STATES": "US", "VEREINIGTE STAATEN": "US", "AMERIKA": "US",
                "DEUTSCHLAND": "DE", "GERMANY": "DE", "BRD": "DE",
                "EUROPA": "EU", "EM": "EU", "EUROPEAN UNION": "EU", "EUROPÄISCHE UNION": "EU",
                "UK": "GB", "UNITED KINGDOM": "GB", "GROSSBRITANNIEN": "GB", "ENGLAND": "GB",
                "SCHWEIZ": "CH", "SWITZERLAND": "CH", "SUISSE": "CH",
                "ÖSTERREICH": "AT", "AUSTRIA": "AT",
                "FRANKREICH": "FR", "FRANCE": "FR",
                "ITALIEN": "IT", "ITALY": "IT", "ITALIA": "IT",
                "SPANIEN": "ES", "SPAIN": "ES", "ESPAÑA": "ES",
                "NIEDERLANDE": "NL", "NETHERLANDS": "NL", "HOLLAND": "NL",
                "CHINA": "CN", "JAPAN": "JP", "KOREA": "KR", "SÜDKOREA": "KR",
                "INDIEN": "IN", "INDIA": "IN", "BRASILIEN": "BR", "BRAZIL": "BR",
                "KANADA": "CA", "CANADA": "CA", "AUSTRALIEN": "AU", "AUSTRALIA": "AU",
                "WIPO": "WO", "INTERNATIONAL": "WO", "WELTWEIT": "WO",
              };
              const normalizedCountries = prefill.countries.map((c: string) => {
                const normalized = c.trim().toUpperCase();
                return countryCodeMap[normalized] || normalized;
              });
              setSelectedLaender(normalizedCountries);
            }

            if (prefill.niceClasses?.length > 0) {
              setSelectedClasses(prefill.niceClasses);
              setAiSelectedClasses(prefill.niceClasses);
            }

            setPrefillApplied(true);
          }
        })
        .catch((err) => {
          console.error("Error loading prefill data:", err);
        })
        .finally(() => {
          setPrefillLoading(false);
        });
    }
  }, [caseId, prefillApplied]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchQuery(searchQuery);
    setHasSearched(true);
    setCurrentPage(1);
  };

  const buildSearchUrl = useCallback(() => {
    if (!hasSearched || !activeSearchQuery) return null;
    const params = new URLSearchParams();
    params.set("q", activeSearchQuery);
    if (selectedClasses.length > 0) params.set("classes", selectedClasses.join(","));
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    if (selectedOffice !== "all") params.set("office", selectedOffice);
    params.set("limit", String(limit));
    params.set("offset", String((currentPage - 1) * limit));
    return `/api/tmsearch/search?${params.toString()}`;
  }, [hasSearched, activeSearchQuery, selectedClasses, selectedStatus, selectedOffice, currentPage]);

  const { data, error, isLoading } = useSWR(buildSearchUrl(), buildSearchUrl() ? fetcher : null);

  useEffect(() => {
    if (caseId && data && hasSearched && !statusUpdated) {
      setStatusUpdated(true);
      fetch(`/api/cases/${caseId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "recherche",
          status: "completed",
          metadata: {
            searchQuery: activeSearchQuery,
            resultsCount: data.total || data.results?.length || 0,
            conflictsCount: aiAnalysis?.conflicts?.length || 0,
            countries: selectedLaender,
            classes: aiSelectedClasses,
            searchedAt: new Date().toISOString(),
          }
        })
      }).catch(console.error);
    }
  }, [caseId, data, hasSearched, activeSearchQuery, statusUpdated, aiAnalysis, selectedLaender, aiSelectedClasses]);

  useEffect(() => {
    const createCaseAutomatically = async () => {
      if (caseId || currentCaseNumber || caseCreatedRef.current || !aiAnalysis) {
        return;
      }
      
      caseCreatedRef.current = true;
      
      try {
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trademarkName: searchQuery.trim() || activeSearchQuery,
            skipBeratung: true,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setCurrentCaseNumber(data.case.caseNumber);
          
          await fetch(`/api/cases/${data.case.id}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "recherche",
              status: "in_progress",
              metadata: {
                searchQuery: activeSearchQuery || searchQuery,
                countries: selectedLaender,
                classes: aiSelectedClasses,
              }
            })
          });
        }
      } catch (error) {
        console.error("Error auto-creating case:", error);
        caseCreatedRef.current = false;
      }
    };
    
    createCaseAutomatically();
  }, [aiAnalysis, caseId, currentCaseNumber, searchQuery, activeSearchQuery, selectedLaender, aiSelectedClasses]);

  const toggleClass = (classNum: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classNum) ? prev.filter((c) => c !== classNum) : [...prev, classNum]
    );
    setCurrentPage(1);
  };

  const toggleAiClass = (classNum: number) => {
    setAiSelectedClasses((prev) =>
      prev.includes(classNum) ? prev.filter((c) => c !== classNum) : [...prev, classNum]
    );
  };

  const toggleLaender = (land: string) => {
    setSelectedLaender((prev) =>
      prev.includes(land) ? prev.filter((l) => l !== land) : [...prev, land]
    );
  };


  const handleExpertRequest = async () => {
    if (!searchQuery.trim()) {
      setExpertError("Bitte geben Sie einen Markennamen ein.");
      return;
    }

    setExpertLoading(true);
    setExpertError(null);
    setExpertSuccess(false);

    try {
      const response = await fetch("/api/expert-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markenname: searchQuery.trim(),
          laender: selectedLaender,
          klassen: aiSelectedClasses,
          aiAnalysis: aiAnalysis,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Anfrage");
      }

      setExpertSuccess(true);
      setExpertError(null);
      setShowSuccessPopup('expert');
    } catch (err: any) {
      setExpertError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setExpertSuccess(false);
    } finally {
      setExpertLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setHasSearched(false);
    setSelectedClasses([]);
    setSelectedStatus("active");
    setSelectedOffice("all");
    setCurrentPage(1);
  };

  const handleStartRegistration = (trademark: Trademark) => {
    router.push(`/dashboard/anmeldung?markName=${encodeURIComponent(activeSearchQuery)}`);
    setRiskCheckTrademark(null);
  };

  const handleNavigationWithCheck = (path: string) => {
    if (hasUnsavedData) {
      setPendingNavigation(path);
      setShowLeaveModal(true);
    } else {
      router.push(path);
    }
  };

  const confirmLeaveWithoutSaving = () => {
    setShowLeaveModal(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const confirmLeaveAndSave = async () => {
    setShowLeaveModal(false);
    await saveResultsAndNavigate(pendingNavigation);
  };

  const saveResultsAndNavigate = async (navigateTo?: string | null) => {
    const activeCaseId = caseId || currentCaseNumber;
    
    if (activeCaseId) {
      try {
        await fetch(`/api/cases/${activeCaseId}/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "recherche",
            status: "completed",
            metadata: {
              searchQuery: activeSearchQuery || searchQuery,
              resultsCount: data?.total || data?.results?.length || 0,
              conflictsCount: aiAnalysis?.conflicts?.length || 0,
              countries: selectedLaender,
              classes: aiSelectedClasses,
              searchedAt: new Date().toISOString(),
              aiAnalysis: aiAnalysis ? {
                overallRisk: aiAnalysis.analysis?.overallRisk,
                recommendation: aiAnalysis.analysis?.recommendation,
                conflictsCount: aiAnalysis.conflicts?.length || 0,
              } : null,
            }
          })
        });
        setResultsSaved(true);
        setStatusUpdated(true);
      } catch (error) {
        console.error("Error saving results:", error);
      }
    } else {
      try {
        const response = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trademarkName: searchQuery,
            skipBeratung: true,
            completeRecherche: true,
            searchData: {
              query: searchQuery,
              countries: selectedLaender,
              classes: aiSelectedClasses,
              conflictsCount: aiAnalysis?.conflicts?.length || 0,
              totalAnalyzed: aiAnalysis?.totalResultsAnalyzed || 0,
              searchTermsUsed: aiAnalysis?.searchTermsUsed || [],
              conflicts: aiAnalysis?.conflicts?.map(c => ({
                id: c.id,
                name: c.name,
                register: c.register,
                holder: c.holder,
                classes: c.classes,
                accuracy: c.accuracy,
                riskLevel: c.riskLevel,
                reasoning: c.reasoning,
                status: c.status,
                applicationNumber: c.applicationNumber,
                applicationDate: c.applicationDate,
                registrationNumber: c.registrationNumber,
                registrationDate: c.registrationDate,
                isFamousMark: c.isFamousMark,
              })) || [],
              aiAnalysis: aiAnalysis ? {
                overallRisk: aiAnalysis.analysis?.overallRisk,
                recommendation: aiAnalysis.analysis?.recommendation,
                riskAssessment: aiAnalysis.analysis?.riskAssessment,
              } : null,
            },
          }),
        });
        
        if (response.ok) {
          const caseData = await response.json();
          setCurrentCaseNumber(caseData.case?.caseNumber || caseData.case?.id);
          setResultsSaved(true);
        }
      } catch (error) {
        console.error("Error creating case:", error);
      }
    }
    
    if (navigateTo) {
      router.push(navigateTo);
      setPendingNavigation(null);
    }
  };
  
  const handleSaveSearchAndContinue = async () => {
    setSavingSearch(true);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trademarkName: searchQuery,
          skipBeratung: true,
          completeRecherche: true,
          searchData: {
            query: searchQuery,
            countries: selectedLaender,
            classes: aiSelectedClasses,
            conflictsCount: aiAnalysis?.conflicts?.length || 0,
            totalAnalyzed: aiAnalysis?.totalResultsAnalyzed || 0,
            searchTermsUsed: aiAnalysis?.searchTermsUsed || [],
            conflicts: aiAnalysis?.conflicts?.map(c => ({
              id: c.id,
              name: c.name,
              register: c.register,
              holder: c.holder,
              classes: c.classes,
              accuracy: c.accuracy,
              riskLevel: c.riskLevel,
              reasoning: c.reasoning,
              status: c.status,
              applicationNumber: c.applicationNumber,
              applicationDate: c.applicationDate,
              registrationNumber: c.registrationNumber,
              registrationDate: c.registrationDate,
              isFamousMark: c.isFamousMark,
            })) || [],
            aiAnalysis: aiAnalysis ? {
              overallRisk: aiAnalysis.analysis?.overallRisk,
              recommendation: aiAnalysis.analysis?.recommendation,
              riskAssessment: aiAnalysis.analysis?.riskAssessment,
            } : null,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }
      
      const responseData = await response.json();
      setCurrentCaseNumber(responseData.case?.caseNumber);
      setShowSaveSearchDialog(false);
      setResultsSaved(true);
      
      if (aiAnalysis?.conflicts && aiAnalysis.conflicts.length > 0) {
        sessionStorage.setItem('risikoanalyse_conflicts', JSON.stringify({
          conflicts: aiAnalysis.conflicts,
          markenname: searchQuery,
          laender: selectedLaender,
          klassen: aiSelectedClasses,
          analysis: aiAnalysis.analysis,
        }));
      }
      
      router.push(`/dashboard/risiko?markenname=${encodeURIComponent(searchQuery)}&conflicts=${aiAnalysis?.conflicts?.length || 0}&laender=${selectedLaender.join(',')}&klassen=${aiSelectedClasses.join(',')}&case=${responseData.case?.caseNumber}`);
    } catch (error) {
      console.error("Error saving search:", error);
      alert("Fehler beim Speichern der Recherche. Bitte versuchen Sie es erneut.");
    } finally {
      setSavingSearch(false);
    }
  };
  
  const handleContinueToRiskAnalysis = async () => {
    const activeCaseId = caseId || currentCaseNumber;
    
    if (activeCaseId && !statusUpdated) {
      try {
        await fetch(`/api/cases/${activeCaseId}/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "recherche",
            status: "completed",
            metadata: {
              searchQuery: activeSearchQuery || searchQuery,
              resultsCount: data?.total || data?.results?.length || 0,
              conflictsCount: aiAnalysis?.conflicts?.length || 0,
              countries: selectedLaender,
              classes: aiSelectedClasses,
              searchedAt: new Date().toISOString(),
              searchTermsUsed: aiAnalysis?.searchTermsUsed || [],
              totalResultsAnalyzed: aiAnalysis?.totalResultsAnalyzed || 0,
              conflicts: aiAnalysis?.conflicts?.map(c => ({
                id: c.id,
                name: c.name,
                register: c.register,
                holder: c.holder,
                classes: c.classes,
                accuracy: c.accuracy,
                riskLevel: c.riskLevel,
                reasoning: c.reasoning,
                status: c.status,
                applicationNumber: c.applicationNumber,
                applicationDate: c.applicationDate,
                registrationNumber: c.registrationNumber,
                registrationDate: c.registrationDate,
                isFamousMark: c.isFamousMark,
              })) || [],
              aiAnalysis: aiAnalysis ? {
                overallRisk: aiAnalysis.analysis?.overallRisk,
                recommendation: aiAnalysis.analysis?.recommendation,
                riskAssessment: aiAnalysis.analysis?.riskAssessment,
                nameAnalysis: aiAnalysis.analysis?.nameAnalysis,
                famousMarkDetected: aiAnalysis.analysis?.famousMarkDetected,
                famousMarkNames: aiAnalysis.analysis?.famousMarkNames,
                conflictsCount: aiAnalysis.conflicts?.length || 0,
              } : null,
            }
          })
        });
        setStatusUpdated(true);
        setResultsSaved(true);
      } catch (error) {
        console.error("Error updating case status:", error);
      }
    }
    
    if (activeCaseId) {
      setResultsSaved(true);
      
      if (aiAnalysis?.conflicts && aiAnalysis.conflicts.length > 0) {
        sessionStorage.setItem('risikoanalyse_conflicts', JSON.stringify({
          conflicts: aiAnalysis.conflicts,
          markenname: searchQuery,
          laender: selectedLaender,
          klassen: aiSelectedClasses,
          analysis: aiAnalysis.analysis,
        }));
      }
      
      router.push(`/dashboard/risiko?markenname=${encodeURIComponent(searchQuery)}&conflicts=${aiAnalysis?.conflicts?.length || 0}&laender=${selectedLaender.join(',')}&klassen=${aiSelectedClasses.join(',')}&case=${activeCaseId}`);
    } else {
      try {
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trademarkName: searchQuery.trim() || activeSearchQuery,
            skipBeratung: true,
          }),
        });
        
        if (res.ok) {
          const responseData = await res.json();
          const newCaseId = responseData.case?.id || responseData.case?.caseNumber;
          setCurrentCaseNumber(responseData.case?.caseNumber);
          setResultsSaved(true);
          
          await fetch(`/api/cases/${newCaseId}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "recherche",
              status: "completed",
              metadata: {
                searchQuery: activeSearchQuery || searchQuery,
                resultsCount: data?.total || data?.results?.length || 0,
                conflictsCount: aiAnalysis?.conflicts?.length || 0,
                countries: selectedLaender,
                classes: aiSelectedClasses,
                searchedAt: new Date().toISOString(),
                conflicts: aiAnalysis?.conflicts || [],
              }
            })
          });
          
          if (aiAnalysis?.conflicts && aiAnalysis.conflicts.length > 0) {
            sessionStorage.setItem('risikoanalyse_conflicts', JSON.stringify({
              conflicts: aiAnalysis.conflicts,
              markenname: searchQuery,
              laender: selectedLaender,
              klassen: aiSelectedClasses,
              analysis: aiAnalysis.analysis,
            }));
          }
          
          router.push(`/dashboard/risiko?markenname=${encodeURIComponent(searchQuery)}&conflicts=${aiAnalysis?.conflicts?.length || 0}&laender=${selectedLaender.join(',')}&klassen=${aiSelectedClasses.join(',')}&case=${newCaseId}`);
        } else {
          setShowSaveSearchDialog(true);
        }
      } catch (error) {
        console.error("Error creating case:", error);
        setShowSaveSearchDialog(true);
      }
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
    setAiStartTime(null);
    setAiError("Analyse wurde abgebrochen.");
  };

  const handleStartAiAnalysis = async (deepSearch: boolean = false) => {
    if (!searchQuery.trim()) {
      setAiError("Bitte geben Sie einen Markennamen ein.");
      return;
    }

    const effectiveClasses = aiSelectedClasses.length === 45 ? [] : aiSelectedClasses;
    const cacheKey = `${searchQuery.trim()}-${effectiveClasses.sort().join(",") || "all"}-${selectedLaender.sort().join(",") || "all"}-${deepSearch ? "deep" : "std"}`;
    const cachedResult = analysisCache.current.get(cacheKey);
    if (cachedResult && !deepSearch) {
      setAiAnalysis(cachedResult);
      setAiError(null);
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 3000);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
    setAiStartTime(Date.now());
    setShowSuccessBanner(false);
    setIsDeepSearch(deepSearch);
    const steps = getInitialProgressSteps(deepSearch);
    
    setAiProgress({
      step1: "pending",
      step2: "pending",
      step3: "pending",
      step4: "pending",
    });

    try {
      steps[0] = { ...steps[0], status: "running", startedAt: Date.now() };
      setProgressSteps([...steps]);
      setAiProgress(prev => ({ ...prev, step1: "started", lastActivity: Date.now() }));

      const variantsRes = await fetch("/api/recherche/step1-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markenname: searchQuery.trim(),
          klassen: effectiveClasses,
          laender: selectedLaender,
          deepSearch,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!variantsRes.ok) {
        const errorData = await variantsRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler bei Variantengenerierung");
      }
      const variantsData = await variantsRes.json();

      steps[0] = { ...steps[0], status: "completed", endedAt: Date.now() };
      steps[1] = { ...steps[1], status: "running", startedAt: Date.now() };
      setProgressSteps([...steps]);
      setAiProgress(prev => ({ 
        ...prev, 
        step1: "completed", 
        step2: "started",
        step1Data: variantsData,
        lastActivity: Date.now() 
      }));

      steps[1] = { ...steps[1], status: "completed", endedAt: Date.now() };
      steps[2] = { ...steps[2], status: "running", startedAt: Date.now() };
      setProgressSteps([...steps]);
      setAiProgress(prev => ({ ...prev, step2: "completed", step3: "started", lastActivity: Date.now() }));

      const searchRes = await fetch("/api/recherche/step2-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryTerms: variantsData.queryTerms,
          klassen: extendedClassSearch ? [] : effectiveClasses,
          laender: selectedLaender,
          extendedClassSearch,
          originalKlassen: effectiveClasses,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!searchRes.ok) {
        const errorData = await searchRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler bei Registersuche");
      }
      const searchData = await searchRes.json();

      steps[2] = { ...steps[2], status: "completed", endedAt: Date.now() };
      steps[3] = { ...steps[3], status: "running", startedAt: Date.now() };
      setProgressSteps([...steps]);
      setAiProgress(prev => ({ 
        ...prev, 
        step3: "completed", 
        step4: "started",
        step3Data: searchData,
        lastActivity: Date.now() 
      }));

      const analyzeRes = await fetch("/api/recherche/step3-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markenname: searchQuery.trim(),
          results: searchData.results,
          klassen: effectiveClasses,
          laender: selectedLaender,
          expertStrategy: variantsData.expertStrategy,
          extendedClassSearch,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler bei Konfliktanalyse");
      }
      const analysisData = await analyzeRes.json();

      steps[3] = { ...steps[3], status: "completed", endedAt: Date.now() };
      setProgressSteps([...steps]);
      setAiProgress(prev => ({ ...prev, step4: "completed", lastActivity: Date.now() }));

      const finalResult = {
        ...analysisData,
        searchTermsUsed: searchData.searchTermsUsed,
        totalResultsAnalyzed: searchData.totalResults,
        expertStrategy: variantsData.expertStrategy,
      };

      setAiAnalysis(finalResult);
      analysisCache.current.set(cacheKey, finalResult);
      setAiLoading(false);
      setAiStartTime(null);
      abortControllerRef.current = null;
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 3000);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      setAiError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setAiLoading(false);
      setAiStartTime(null);
      abortControllerRef.current = null;
    }
  };

  const getRiskBadge = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high":
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 text-lg font-bold rounded-full">
            🔴 Hohes Risiko
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 text-lg font-bold rounded-full">
            🟡 Mittleres Risiko
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-lg font-bold rounded-full">
            🟢 Niedriges Risiko
          </span>
        );
    }
  };

  const getConflictRiskBadge = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high":
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">🔴 Hoch</span>;
      case "medium":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">🟡 Mittel</span>;
      case "low":
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">🟢 Niedrig</span>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (trademarkStatus: string) => {
    switch (trademarkStatus) {
      case "active":
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aktiv</span>;
      case "expired":
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Abgelaufen</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Unbekannt</span>;
    }
  };

  const getOfficeBadge = (office: string) => {
    const colors: Record<string, string> = {
      WO: "bg-purple-100 text-purple-700",
      EU: "bg-blue-100 text-blue-700",
      DE: "bg-gray-100 text-gray-700",
      US: "bg-red-100 text-red-700",
      GB: "bg-indigo-100 text-indigo-700",
      CH: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`px-2 py-1 ${colors[office] || "bg-gray-100 text-gray-700"} text-xs font-medium rounded-full`}>
        {office}
      </span>
    );
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return "text-red-600";
    if (accuracy >= 90) return "text-orange-600";
    if (accuracy >= 85) return "text-yellow-600";
    return "text-green-600";
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const trademarks: Trademark[] = data?.results || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const isTestMode = data?.isTestMode || false;

  const hasActiveFilters = selectedClasses.length > 0 || selectedStatus !== "all" || selectedOffice !== "all";

  const niceClassOptions = NICE_CLASSES.slice(0, 11).map(c => ({
    value: c.id,
    label: formatClassLabel(c),
  }));

  return (
    <div className="space-y-6">
      <WorkflowProgress 
        currentStep={2} 
        stepStatuses={caseId ? { beratung: "completed" } : { beratung: "skipped" }}
      />

      {(!searchQuery.trim() || selectedLaender.length === 0 || aiSelectedClasses.length === 0) && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">Bitte füllen Sie alle Felder aus:</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {!searchQuery.trim() && (
                  <li className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-primary" />
                    Markenname eingeben
                  </li>
                )}
                {selectedLaender.length === 0 && (
                  <li className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-primary" />
                    Mindestens ein Land / Register auswählen
                  </li>
                )}
                {aiSelectedClasses.length === 0 && (
                  <li className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-primary" />
                    Mindestens eine Nizza-Klasse auswählen
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setAdminTab('user')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                adminTab === 'user'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-purple-700 hover:bg-white/50'
              }`}
            >
              <Eye className="w-4 h-4" />
              Benutzer-Ansicht
            </button>
            <button
              onClick={() => setAdminTab('debug')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                adminTab === 'debug'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-purple-700 hover:bg-white/50'
              }`}
            >
              <Code className="w-4 h-4" />
              Debug-Konsole
            </button>
          </div>
        </div>
      )}

      <div className={!isAdmin || adminTab === 'user' ? '' : 'hidden'}>
          {prefillData && (
            <div className="space-y-3">
              <PrefillBanner
                source={prefillData.source}
                date={prefillData.date}
              />
              {prefillData.missingFields && prefillData.missingFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-800 font-medium">
                      Fehlende Informationen aus der Beratung
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Diese Felder fehlen noch: {prefillData.missingFields.join(", ")}
                    </p>
                    <a
                      href={`/dashboard/copilot?catchUpCase=${caseId}`}
                      className="inline-flex items-center gap-1 text-sm text-amber-800 font-medium mt-2 hover:text-amber-900 transition-colors underline"
                    >
                      Beratung fortsetzen →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {prefillLoading && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-primary font-medium">Lade Daten aus der Beratung...</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Markenrecherche</h1>
                <p className="text-gray-600 mt-1">
                  Prüfen Sie, ob Ihr gewünschter Markenname bereits registriert ist
                </p>
              </div>
              <a
                href="/dashboard/copilot?topic=recherche"
                className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-colors"
                title="Fragen zur Recherche?"
              >
                <HelpCircle className="w-5 h-5" />
              </a>
              <a
                href="/dashboard/copilot?topic=recherche"
                className="text-xs text-primary hover:text-primary/80 underline transition-colors"
                title="Tour starten"
              >
                Tour starten
              </a>
            </div>
            <button
              onClick={handleOpenConsultationsModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FolderOpen className="w-5 h-5 text-primary" />
              <span className="font-medium text-gray-700">Meine Markenfälle</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markenname
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="z.B. TechFlow, BrandX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Länder / Register
              </label>
              <LaenderDropdown
                selectedLaender={selectedLaender}
                onToggleLand={toggleLaender}
                onClearAll={() => setSelectedLaender([])}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nizza-Klassifikation
              </label>
              <NiceClassDropdown
                  selectedClasses={aiSelectedClasses}
                  onToggleClass={toggleAiClass}
                  onClearAll={() => setAiSelectedClasses([])}
                />
                
                {aiSelectedClasses.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={extendedClassSearch}
                          onChange={(e) => setExtendedClassSearch(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-primary transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                      </div>
                      <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                        Klassenübergreifende Analyse
                      </span>
                      <div className="relative group/tooltip">
                        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-primary cursor-help" />
                        <div className="absolute left-6 top-0 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                          Findet auch Marken in anderen Klassen, deren Waren-/Dienstleistungsbeschreibungen sich überschneiden könnten.
                        </div>
                      </div>
                    </label>
                    {extendedClassSearch && (
                      <p className="text-xs text-gray-500 mt-2 ml-13">
                        Suche in allen Klassen aktiv – Marken außerhalb Ihrer Auswahl werden orange markiert.
                      </p>
                    )}
                  </div>
                )}
                
                {aiSelectedClasses.length > 0 && getAllRelatedClasses(aiSelectedClasses).length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Verwandte Klassen mit möglichen Überschneidungen:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getAllRelatedClasses(aiSelectedClasses).slice(0, 10).map(cls => (
                        <span key={cls} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          Klasse {cls}
                        </span>
                      ))}
                      {getAllRelatedClasses(aiSelectedClasses).length > 10 && (
                        <span className="px-2 py-0.5 bg-blue-100/50 text-blue-600 text-xs rounded">
                          +{getAllRelatedClasses(aiSelectedClasses).length - 10} weitere
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {aiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{aiError}</p>
              </div>
            )}

          <button
            type="button"
            onClick={() => handleStartAiAnalysis(true)}
            disabled={aiLoading || !searchQuery.trim() || selectedLaender.length === 0 || aiSelectedClasses.length === 0}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Recherche läuft...
              </>
            ) : (
              <>
                <Search className="w-6 h-6" />
                Recherche starten
              </>
            )}
          </button>
        </div>
      </div>

          {aiLoading && progressSteps.length > 0 && (
            <div className="mt-6">
              <ProgressTimeline 
                steps={progressSteps}
                isDeepSearch={isDeepSearch}
                onCancel={handleCancelAnalysis}
                elapsedTime={elapsedTime}
              />
            </div>
          )}

          {aiAnalysis && (
            <div className="mt-6 space-y-4">
              <AIProcessOverview
                searchTerm={searchQuery}
                progress={aiProgress}
                analysis={aiAnalysis}
                selectedCountries={selectedLaender}
                selectedClasses={aiSelectedClasses}
              />
              
              {/* Verwendete Suchvarianten anzeigen */}
              {aiAnalysis.searchTermsUsed && aiAnalysis.searchTermsUsed.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Verwendete Suchbegriffe ({aiAnalysis.searchTermsUsed.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.searchTermsUsed.map((term: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          )}

          {/* Success Banner */}
          {showSuccessBanner && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Analyse abgeschlossen</p>
                <p className="text-sm text-gray-600">Die Ergebnisse werden unten angezeigt.</p>
              </div>
            </div>
          )}

          {aiAnalysis && (
              <div ref={resultsRef} className="mt-6 space-y-5 scroll-mt-4">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">KI-Analyseergebnis</h3>
                          <p className="text-sm text-gray-500">für "{searchQuery}"</p>
                        </div>
                      </div>
                      {getRiskBadge(aiAnalysis.analysis.overallRisk)}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => setWidgetPopup('conflicts')}
                        className="bg-white rounded-xl p-3 border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer text-left group"
                      >
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{aiAnalysis.conflicts.length}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          Konflikte gefunden
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWidgetPopup('analyzed')}
                        className="bg-white rounded-xl p-3 border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer text-left group"
                      >
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{aiAnalysis.totalResultsAnalyzed}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          Marken analysiert
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWidgetPopup('variants')}
                        className="bg-white rounded-xl p-3 border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer text-left col-span-2 sm:col-span-1 group"
                      >
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{aiAnalysis.searchTermsUsed.length}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          Suchvarianten
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      </button>
                    </div>

                    {aiAnalysis.analysis.famousMarkDetected && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Bekannte Marke erkannt</p>
                          <p className="text-sm text-amber-700">
                            {aiAnalysis.analysis.famousMarkNames.join(", ")} - Bekannte Marken haben erweiterten Schutz (Verwässerungsschutz). 
                            Das Risiko von Widersprüchen ist auch bei niedrigerer Ähnlichkeit erhöht.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiAnalysis.analysis.recommendation.split('.').slice(0, 2).join('.') + '.'}
                      </p>
                    </div>
                  </div>
                </div>

                {aiAnalysis.conflicts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Kollidierende Marken ({aiAnalysis.conflicts.length})
                    </h3>
                    
                    {(() => {
                      const crossClassConflicts = extendedClassSearch 
                        ? aiAnalysis.conflicts.filter(c => 
                            !c.classes.some(cls => aiSelectedClasses.includes(cls))
                          )
                        : [];
                      
                      if (crossClassConflicts.length > 0) {
                        return (
                          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-orange-800">
                                {crossClassConflicts.length} Marke{crossClassConflicts.length !== 1 ? 'n' : ''} in anderen Klassen gefunden
                              </p>
                              <p className="text-sm text-orange-700 mt-1">
                                Diese könnten trotzdem relevant sein, wenn sich die Waren-/Dienstleistungsbeschreibungen überschneiden.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiAnalysis.conflicts.map((conflict, idx) => {
                        const riskStyles = conflict.riskLevel === "high" 
                          ? "border-red-200 hover:border-red-300 bg-red-50/50" 
                          : conflict.riskLevel === "medium" 
                            ? "border-orange-200 hover:border-orange-300 bg-orange-50/50" 
                            : "border-green-200 hover:border-green-300 bg-green-50/50";
                        const riskEmoji = conflict.riskLevel === "high" ? "🔴" : conflict.riskLevel === "medium" ? "🟡" : "🟢";
                        
                        const isInSelectedClasses = conflict.classes.some(cls => aiSelectedClasses.includes(cls));
                        const isCrossClass = extendedClassSearch && !isInSelectedClasses && conflict.classes.length > 0;
                        
                        const relatedClassInfo = conflict.classes.length > 0 && !isInSelectedClasses
                          ? conflict.classes.map(cls => getClassRelationInfo(aiSelectedClasses, cls)).find(info => info.isRelated)
                          : null;
                        const isRelatedClass = !!relatedClassInfo;
                        
                        const formatGermanDate = (dateStr: string | null) => {
                          if (!dateStr) return "-";
                          try {
                            const date = new Date(dateStr);
                            return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
                          } catch {
                            return "-";
                          }
                        };
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedConflict(conflict)}
                            className={`p-4 rounded-xl border-2 ${riskStyles} transition-all text-left hover:shadow-md cursor-pointer group`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{conflict.name}</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {conflict.isFamousMark && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                      <Star className="w-3 h-3" />
                                      Bekannte Marke
                                    </span>
                                  )}
                                  {isCrossClass && !isRelatedClass && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                      Klassen: {conflict.classes.join(", ")} (nicht Ihre Auswahl)
                                    </span>
                                  )}
                                  {isRelatedClass && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                      <Lightbulb className="w-3 h-3" />
                                      Verwandte Klasse
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="flex items-center gap-1 text-sm font-bold whitespace-nowrap">
                                {riskEmoji} {conflict.accuracy}%
                              </span>
                            </div>
                            {conflict.holder && conflict.holder !== "Unbekannt" && conflict.holder !== "unbekannt" && (
                              <p className="text-sm text-gray-600 mb-1 line-clamp-1">{conflict.holder}</p>
                            )}
                            
                            <div className="border-t border-gray-200/50 my-2 pt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Status:</span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${conflict.status === "active" ? "bg-green-100 text-green-700" : conflict.status === "expired" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-600"}`}>
                                  {conflict.status === "active" ? "Aktiv" : conflict.status === "expired" ? "Abgelaufen" : "Unbekannt"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Anmeldung: {conflict.applicationNumber || "-"} {conflict.applicationDate ? `(${formatGermanDate(conflict.applicationDate)})` : ""}
                              </p>
                              <p className="text-xs text-gray-500">
                                Registrierung: {conflict.registrationNumber || "-"} {conflict.registrationDate ? `(${formatGermanDate(conflict.registrationDate)})` : ""}
                              </p>
                            </div>
                            
                            <div className="border-t border-gray-200/50 pt-2 mt-2 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {conflict.register}
                              </span>
                              {conflict.classes.length > 0 && !isCrossClass && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {conflict.classes.length} Klassen
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-3 h-3" />
                              Details anzeigen
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {aiAnalysis.conflicts.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-green-800 mb-1">Keine Konflikte gefunden</h4>
                    <p className="text-sm text-green-700">
                      Die KI-Analyse hat keine potenziellen Markenkonflikte identifiziert.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleContinueToRiskAnalysis}
                  className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl text-lg"
                >
                  <BarChart3 className="w-6 h-6" />
                  Weiter zur Risikoanalyse
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
          )}

      {hasSearched && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              <strong className="text-gray-900">{total}</strong> ähnliche Marken für "<span className="font-medium">{activeSearchQuery}</span>" gefunden
              {data?.filtered > 0 && <span className="text-gray-500"> ({data.filtered} durch Filter ausgeblendet)</span>}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">
              {error.message || "Fehler beim Laden der Marken. Bitte versuchen Sie es erneut."}
            </div>
          ) : trademarks.length === 0 ? (
            <div className="bg-green-50 rounded-xl p-8 text-center border border-green-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Keine ähnlichen Marken gefunden
              </h3>
              <p className="text-green-700 mb-6">
                Es gibt keine registrierten Marken, die "{activeSearchQuery}" ähneln. 
                Sie können mit der Anmeldung fortfahren.
              </p>
              <a
                href={`/dashboard/anmeldung?markName=${encodeURIComponent(activeSearchQuery)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
              >
                <FilePlus className="w-5 h-5" />
                Marke jetzt anmelden
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {trademarks.map((trademark) => (
                <div
                  key={trademark.id}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  onClick={() => setDetailTrademark(trademark)}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                        {trademark.imageUrl ? (
                          <img src={trademark.imageUrl} alt={trademark.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-gray-400">{trademark.name.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{trademark.name}</h3>
                          {getStatusBadge(trademark.status)}
                          {getOfficeBadge(trademark.office)}
                          <span className={`flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs font-semibold ${getAccuracyColor(trademark.accuracy)}`}>
                            <Percent className="w-3 h-3" />
                            {trademark.accuracy}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-sm text-gray-600">
                          {trademark.holder && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {trademark.holder}
                                {trademark.holderCountry && <span className="text-gray-400"> ({trademark.holderCountry})</span>}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{trademark.registrationNumber || trademark.applicationNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">
                              {trademark.expiryDate ? `Ablauf: ${formatDate(trademark.expiryDate)}` : "Kein Ablaufdatum"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {trademark.niceClasses?.slice(0, 5).map((cls) => (
                        <span key={cls} className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg">
                          Klasse {cls}
                        </span>
                      ))}
                      {trademark.niceClasses?.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                          +{trademark.niceClasses.length - 5} weitere
                        </span>
                      )}
                    </div>

                    {trademark.designationCountries && trademark.designationCountries.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          Schutzländer: {trademark.designationCountries.slice(0, 10).join(", ")}
                          {trademark.designationCountries.length > 10 && ` +${trademark.designationCountries.length - 10} weitere`}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailTrademark(trademark);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Details anzeigen
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRiskCheckTrademark(trademark);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Kollisionsrisiko prüfen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Seite {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
      </div>

      {isAdmin && (
        <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${adminTab === 'debug' ? '' : 'hidden'}`}>
          <DebugConsole 
            searchTerm={searchQuery}
            selectedCountry={selectedLaender[0] || "DE"}
            selectedClasses={selectedClasses}
          />
        </div>
      )}

      {riskCheckTrademark && (
        <RiskCheckModal
          trademark={riskCheckTrademark}
          onClose={() => setRiskCheckTrademark(null)}
          onStartRegistration={handleStartRegistration}
        />
      )}

      {detailTrademark && (
        <DetailModal
          trademark={detailTrademark}
          onClose={() => setDetailTrademark(null)}
        />
      )}

      {selectedConflict && (
        <ConflictDetailModal
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
          selectedClasses={aiSelectedClasses}
        />
      )}

      {widgetPopup === 'conflicts' && aiAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWidgetPopup(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Konflikte gefunden</h3>
                  <p className="text-sm text-gray-500">{aiAnalysis.conflicts.length} potenzielle Kollisionen</p>
                </div>
              </div>
              <button onClick={() => setWidgetPopup(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {aiAnalysis.conflicts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-600">Keine Konflikte identifiziert</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiAnalysis.conflicts.map((conflict, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        conflict.riskLevel === 'high' ? 'border-red-200 bg-red-50' :
                        conflict.riskLevel === 'medium' ? 'border-orange-200 bg-orange-50' :
                        'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{conflict.name}</span>
                        <span className={`text-sm font-bold ${
                          conflict.riskLevel === 'high' ? 'text-red-600' :
                          conflict.riskLevel === 'medium' ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {conflict.riskLevel === 'high' ? '🔴' : conflict.riskLevel === 'medium' ? '🟡' : '🟢'} {conflict.accuracy}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{conflict.register} • {conflict.classes?.join(', ') || 'Keine Klassen'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {widgetPopup === 'analyzed' && aiAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWidgetPopup(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Marken analysiert</h3>
                  <p className="text-sm text-gray-500">Filterungsprozess erklärt</p>
                </div>
              </div>
              <button onClick={() => setWidgetPopup(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600">API-Treffer insgesamt</span>
                  <span className="text-2xl font-bold text-gray-900">{aiAnalysis.totalResultsAnalyzed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${aiAnalysis.totalResultsAnalyzed > 0 ? (aiAnalysis.conflicts.length / aiAnalysis.totalResultsAnalyzed) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                  <p className="text-2xl font-bold text-red-600">{aiAnalysis.conflicts.length}</p>
                  <p className="text-xs text-red-700">Echte Konflikte (≥50%)</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-600">{aiAnalysis.totalResultsAnalyzed - aiAnalysis.conflicts.length}</p>
                  <p className="text-xs text-green-700">Gefiltert (unter 50%)</p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Intelligente Filterung</p>
                    <p className="text-sm text-blue-700">
                      Unsere KI berechnet für jede Marke eine kombinierte Ähnlichkeit aus phonetischer (60%) und visueller (40%) Analyse. 
                      Nur Marken mit ≥50% Ähnlichkeit werden als echte Konflikte gewertet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {widgetPopup === 'variants' && aiAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWidgetPopup(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Suchvarianten</h3>
                  <p className="text-sm text-gray-500">KI-generierte Suchbegriffe</p>
                </div>
              </div>
              <button onClick={() => setWidgetPopup(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-100">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-purple-900 mb-1">Intelligente Suchstrategie</p>
                    <p className="text-sm text-purple-700">
                      Die KI generiert automatisch phonetische, visuelle und konzeptionelle Varianten Ihres Markennamens, um auch ähnlich klingende oder aussehende Marken zu finden.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.searchTermsUsed.map((term, idx) => (
                  <span 
                    key={idx}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      idx === 0 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {term}
                  </span>
                ))}
              </div>
              
              {aiAnalysis.searchTermsUsed.length > 1 && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Der erste Begriff ist Ihre Original-Eingabe, die weiteren sind KI-generierte Varianten.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveSearchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveSearchDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-primary to-primary/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Recherche speichern</h2>
                    <p className="text-white/80 text-sm">Neuen Fall anlegen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveSearchDialog(false)}
                  className="text-white/80 hover:text-white p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-600 mb-3">Die Recherche wird als neuer Fall gespeichert:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Markenname:</span>
                    <span className="font-semibold text-gray-900">{searchQuery}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Länder:</span>
                    <span className="font-medium text-gray-900">{selectedLaender.length > 0 ? selectedLaender.join(", ") : "Keine ausgewählt"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Nizza-Klassen:</span>
                    <span className="font-medium text-gray-900">{aiSelectedClasses.length > 0 ? aiSelectedClasses.join(", ") : "Alle"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Konflikte gefunden:</span>
                    <span className={`font-semibold ${(aiAnalysis?.conflicts?.length || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {aiAnalysis?.conflicts?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800">
                      <strong>Beratung wurde übersprungen.</strong> Der Fall wird ohne vorherige Markenberatung angelegt. Dies wird in der Journey-Timeline vermerkt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3">
              <button
                onClick={handleSaveSearchAndContinue}
                disabled={savingSearch}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingSearch ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Fall erstellen & weiter zur Risikoanalyse
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSaveSearchDialog(false)}
                disabled={savingSearch}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSuccessPopup(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 ${showSuccessPopup === 'recherche' ? 'bg-teal-500' : 'bg-blue-500'}`}>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">
                {showSuccessPopup === 'recherche' ? 'Anfrage gesendet!' : 'Experten-Anfrage gesendet!'}
              </h2>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-700 text-lg mb-4">
                  {showSuccessPopup === 'recherche' 
                    ? 'Ihre Anfrage für eine gründliche Markenrecherche wurde erfolgreich übermittelt.'
                    : 'Ihre Anfrage für ein Experten-Gespräch wurde erfolgreich übermittelt.'
                  }
                </p>
                <p className="text-gray-600">
                  {showSuccessPopup === 'recherche'
                    ? 'Wir werden Ihren Markennamen eingehend prüfen und Ihnen innerhalb von 24-48 Stunden einen detaillierten Bericht per E-Mail zusenden.'
                    : 'Ein Markenrechtsexperte wird sich in Kürze bei Ihnen melden, um einen Beratungstermin zu vereinbaren.'
                  }
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Bestätigung per E-Mail</p>
                    <p className="text-sm text-gray-600">
                      Sie erhalten in Kürze eine Bestätigungs-E-Mail an Ihre registrierte Adresse.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowSuccessPopup(null)}
                className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLeaveModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ungespeicherte Ergebnisse</h2>
                  <p className="text-white/80 text-sm">Speichern oder Verwerfen?</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Sie haben Recherche-Ergebnisse, die noch nicht gespeichert wurden. 
                Möchten Sie diese speichern, bevor Sie die Seite verlassen?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={confirmLeaveAndSave}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Speichern und verlassen
                </button>
                <button
                  onClick={confirmLeaveWithoutSaving}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Verwerfen und verlassen
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-full px-6 py-3 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConsultationsModal
        isOpen={showConsultationsModal}
        onClose={() => setShowConsultationsModal(false)}
        consultations={consultations}
        isLoading={false}
        onDelete={handleDeleteConsultation}
        deletingId={deletingId}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
