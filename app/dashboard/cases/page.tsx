"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import {
  Search,
  Plus,
  Loader2,
  FolderOpen,
  X,
  Check,
  Circle,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Square,
  CheckSquare,
  Minus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Fehler beim Laden");
  }
  return res.json();
};

interface CaseStep {
  id: string;
  caseId: string;
  step: string;
  status: string;
  completedAt: string | null;
  skippedAt: string | null;
}

interface TrademarkCase {
  id: string;
  caseNumber: string;
  trademarkName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: CaseStep[];
}

const STEPS = [
  { key: "beratung", label: "Beratung" },
  { key: "markenname", label: "Markenname" },
  { key: "recherche", label: "Recherche" },
  { key: "analyse", label: "Analyse" },
  { key: "ueberpruefung", label: "Prüfung" },
  { key: "anmeldung", label: "Anmeldung" },
  { key: "kommunikation", label: "Komm." },
  { key: "ueberwachung", label: "Monitor" },
  { key: "fristen", label: "Fristen" },
];


function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return { label: "Aktiv", className: "bg-teal-100 text-teal-700" };
    case "draft":
      return { label: "Entwurf", className: "bg-gray-100 text-gray-600" };
    case "in_progress":
      return { label: "In Bearbeitung", className: "bg-blue-100 text-blue-700" };
    case "filed":
      return { label: "Angemeldet", className: "bg-amber-100 text-amber-700" };
    case "registered":
      return { label: "Eingetragen", className: "bg-green-100 text-green-700" };
    case "rejected":
      return { label: "Abgelehnt", className: "bg-red-100 text-red-700" };
    case "monitoring":
      return { label: "Überwacht", className: "bg-purple-100 text-purple-700" };
    case "archived":
      return { label: "Archiviert", className: "bg-slate-100 text-slate-600" };
    case "completed":
      return { label: "Abgeschlossen", className: "bg-green-100 text-green-700" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-600" };
  }
}

function StepProgress({ steps }: { steps: CaseStep[] }) {
  const stepMap = new Map(steps.map((s) => [s.step, s]));

  return (
    <div className="flex flex-wrap items-center gap-1 mt-3">
      {STEPS.map((step) => {
        const stepData = stepMap.get(step.key);
        const isCompleted = stepData?.status === "completed";
        const isSkipped = stepData?.status === "skipped";
        const isActive = stepData?.status === "in_progress";

        return (
          <div
            key={step.key}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
              isCompleted
                ? "bg-teal-100 text-teal-700"
                : isSkipped
                ? "bg-gray-100 text-gray-400 line-through"
                : isActive
                ? "bg-teal-50 text-teal-600 ring-1 ring-teal-200"
                : "bg-gray-50 text-gray-400"
            }`}
            title={step.label}
          >
            {isCompleted ? (
              <Check className="w-3 h-3" />
            ) : isActive ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            <span className="hidden md:inline">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CaseCard({
  caseData,
  onClick,
  isSelected,
  onSelect,
  isSelectionMode,
}: {
  caseData: TrademarkCase;
  onClick: () => void;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  isSelectionMode: boolean;
}) {
  const statusBadge = getStatusBadge(caseData.status);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer group relative ${
        isSelected 
          ? "border-teal-400 ring-2 ring-teal-100" 
          : "border-gray-200 hover:border-teal-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onSelect}
          className={`flex-shrink-0 mt-1 p-1 rounded transition-all ${
            isSelectionMode || isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          } ${
            isSelected
              ? "text-teal-600"
              : "text-gray-400 hover:text-teal-500"
          }`}
          title={isSelected ? "Auswahl aufheben" : "Auswählen"}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-mono group-hover:text-teal-600 transition-colors">
                {caseData.caseNumber}
              </h2>
              <p className="text-base text-gray-600 mt-1">
                {caseData.trademarkName || "Kein Markenname"}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
                      <span>Erstellt: {formatDate(caseData.createdAt)}</span>
                      <span>Aktualisiert: {formatDate(caseData.updatedAt)}</span>
                    </div>

          <StepProgress steps={caseData.steps || []} />
        </div>
      </div>
    </div>
  );
}

function SelectionToolbar({
  selectedCount,
  onDelete,
  onClearSelection,
  isDeleting,
}: {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
  isDeleting: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
      <span className="text-teal-800 font-medium">
        {selectedCount} {selectedCount === 1 ? "Fall" : "Fälle"} ausgewählt
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-100 rounded-lg transition-colors font-medium"
        >
          Auswahl aufheben
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Löschen
        </button>
      </div>
    </div>
  );
}

function SelectAllCheckbox({
  cases,
  selectedCases,
  onSelectAll,
}: {
  cases: TrademarkCase[];
  selectedCases: Set<string>;
  onSelectAll: () => void;
}) {
  if (cases.length === 0) return null;

  const allSelected = cases.length > 0 && cases.every(c => selectedCases.has(c.id));
  const someSelected = cases.some(c => selectedCases.has(c.id)) && !allSelected;

  return (
    <button
      onClick={onSelectAll}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
        allSelected || someSelected
          ? "text-teal-700 bg-teal-50 hover:bg-teal-100"
          : "text-gray-600 hover:bg-gray-100"
      }`}
      title={allSelected ? "Alle abwählen" : "Alle auswählen"}
    >
      {allSelected ? (
        <CheckSquare className="w-5 h-5" />
      ) : someSelected ? (
        <div className="relative w-5 h-5">
          <Square className="w-5 h-5" />
          <Minus className="w-3 h-3 absolute top-1 left-1" />
        </div>
      ) : (
        <Square className="w-5 h-5" />
      )}
      <span className="text-sm font-medium">
        {allSelected ? "Alle abwählen" : "Alle auswählen"}
      </span>
    </button>
  );
}

function NewCaseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}) {
  const [trademarkName, setTrademarkName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(trademarkName);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Neuen Fall erstellen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="trademarkName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Markenname (optional)
            </label>
            <input
              type="text"
              id="trademarkName"
              value={trademarkName}
              onChange={(e) => setTrademarkName(e.target.value)}
              placeholder="z.B. Meine Marke"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            />
            <p className="mt-2 text-sm text-gray-500">
              Sie können den Namen später jederzeit ändern.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Fall erstellen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreateCase }: { onCreateCase: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Keine Markenfälle vorhanden
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Erstellen Sie Ihren ersten Markenfall, um mit der Recherche und
        Anmeldung zu beginnen.
      </p>
      <button
        onClick={onCreateCase}
        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Ersten Fall erstellen
      </button>
    </div>
  );
}

export default function CasesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("alle");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "single" | "selected"; caseId?: string; caseName?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedCases.size > 0;

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (status !== "alle") queryParams.set("status", status);
  const queryString = queryParams.toString();

  const { data, error, isLoading } = useSWR<{ cases: TrademarkCase[] }>(
    `/api/cases${queryString ? `?${queryString}` : ""}`,
    fetcher
  );

  const cases = data?.cases || [];

  useEffect(() => {
    setSelectedCases(new Set());
  }, [search, status]);

  const handleSelectCase = useCallback((caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = cases.every(c => selectedCases.has(c.id));
    if (allSelected) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(cases.map(c => c.id)));
    }
  }, [cases, selectedCases]);

  const handleClearSelection = useCallback(() => {
    setSelectedCases(new Set());
  }, []);

  const handleCreateCase = async (trademarkName: string) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trademarkName: trademarkName || null }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erstellen");
      }

      const result = await res.json();
      setIsModalOpen(false);
      mutate(`/api/cases${queryString ? `?${queryString}` : ""}`);
      router.push(`/dashboard/case/${result.case.id}`);
    } catch (error) {
      console.error("Error creating case:", error);
      alert("Fehler beim Erstellen des Falls. Bitte versuchen Sie es erneut.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Fehler beim Löschen");
      }

      mutate(`/api/cases${queryString ? `?${queryString}` : ""}`);
      setDeleteConfirm(null);
      setSelectedCases(prev => {
        const newSet = new Set(prev);
        newSet.delete(caseId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting case:", error);
      alert("Fehler beim Löschen des Falls. Bitte versuchen Sie es erneut.");
    } finally {
      setIsDeleting(false);
      setDeletingCaseId(null);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const selectedIds = Array.from(selectedCases);
      const deletePromises = selectedIds.map(id =>
        fetch(`/api/cases/${id}`, { method: "DELETE" })
      );
      
      await Promise.all(deletePromises);

      mutate(`/api/cases${queryString ? `?${queryString}` : ""}`);
      setDeleteConfirm(null);
      setSelectedCases(new Set());
    } catch (error) {
      console.error("Error deleting selected cases:", error);
      alert("Fehler beim Löschen der Fälle. Bitte versuchen Sie es erneut.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
            Meine Markenfälle
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Markenrecherchen und Anmeldungen
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Neuer Fall
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suche nach Markenname oder Fallnummer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-all"
        >
          <option value="alle">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="draft">Entwurf</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="filed">Angemeldet</option>
          <option value="registered">Eingetragen</option>
          <option value="rejected">Abgelehnt</option>
          <option value="monitoring">Überwacht</option>
          <option value="archived">Archiviert</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Fehler beim Laden
          </h3>
          <p className="text-gray-600">
            Die Fälle konnten nicht geladen werden. Bitte versuchen Sie es
            erneut.
          </p>
        </div>
      ) : cases.length === 0 ? (
        search || status !== "alle" ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keine Ergebnisse gefunden
            </h3>
            <p className="text-gray-500">
              Versuchen Sie es mit anderen Suchbegriffen oder Filtern.
            </p>
          </div>
        ) : (
          <EmptyState onCreateCase={() => setIsModalOpen(true)} />
        )
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SelectAllCheckbox
              cases={cases}
              selectedCases={selectedCases}
              onSelectAll={handleSelectAll}
            />
            <span className="text-sm text-gray-500">
              {cases.length} {cases.length === 1 ? "Fall" : "Fälle"}
            </span>
          </div>

          <SelectionToolbar
            selectedCount={selectedCases.size}
            onDelete={() => setDeleteConfirm({ type: "selected" })}
            onClearSelection={handleClearSelection}
            isDeleting={isDeleting}
          />

          <div className="grid gap-4">
            {cases.map((caseData) => (
              <CaseCard
                key={caseData.id}
                caseData={caseData}
                onClick={() => router.push(`/dashboard/case/${caseData.id}`)}
                isSelected={selectedCases.has(caseData.id)}
                onSelect={(e) => handleSelectCase(caseData.id, e)}
                isSelectionMode={isSelectionMode}
              />
            ))}
          </div>
        </div>
      )}

      <NewCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCase}
        isLoading={isCreating}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm?.type === "single" && deleteConfirm.caseId) {
            setDeletingCaseId(deleteConfirm.caseId);
            handleDeleteCase(deleteConfirm.caseId);
          } else if (deleteConfirm?.type === "selected") {
            handleDeleteSelected();
          }
        }}
        isLoading={isDeleting}
        title={deleteConfirm?.type === "selected" ? `${selectedCases.size} Fälle löschen?` : "Fall löschen?"}
        message={
          deleteConfirm?.type === "selected"
            ? `Möchten Sie wirklich ${selectedCases.size} ${selectedCases.size === 1 ? "Fall" : "Fälle"} unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
            : `Möchten Sie den Fall "${deleteConfirm?.caseName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
        }
      />
    </div>
  );
}
