"use client";

import { useState, useRef, useCallback } from "react";
import { X, FileText, Download, Loader2, FileDown, Edit3, Check, RefreshCw } from "lucide-react";

interface Conflict {
  id?: string;
  name: string;
  office?: string;
  classes: (string | number)[];
  riskLevel?: "high" | "medium" | "low";
  riskScore?: number;
  accuracy?: number;
  reasoning?: string;
  status?: string;
  applicationNumber?: string;
  registrationNumber?: string;
  dates?: {
    applied?: string;
    granted?: string;
  };
  owner?: {
    name?: string;
  };
}

interface ReportData {
  trademarkName: string;
  trademarkType: string;
  niceClasses: number[];
  countries: string[];
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  conflicts: Conflict[];
  summary?: string;
}

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData;
  caseNumber?: string;
  clientName?: string;
}

export function ReportGenerator({ isOpen, onClose, reportData, caseNumber, clientName }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    setExportError(null);
    
    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportData,
          caseNumber,
          clientName,
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler bei der Bericht-Generierung");
      }

      const data = await response.json();
      setReportContent(data.report);
    } catch (error) {
      console.error("Report generation error:", error);
      setExportError("Fehler bei der Bericht-Generierung. Bitte versuchen Sie es erneut.");
    } finally {
      setIsGenerating(false);
    }
  }, [reportData, caseNumber, clientName]);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const response = await fetch("/api/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: reportContent,
          format: "pdf",
          filename: `Markengutachten_${reportData.trademarkName}_${new Date().toISOString().split("T")[0]}`,
        }),
      });

      if (!response.ok) {
        throw new Error("PDF-Export fehlgeschlagen");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Markengutachten_${reportData.trademarkName}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("PDF export error:", error);
      setExportError("PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setIsExporting(false);
    }
  }, [reportContent, reportData.trademarkName]);

  const handleExportWord = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const response = await fetch("/api/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: reportContent,
          format: "docx",
          filename: `Markengutachten_${reportData.trademarkName}_${new Date().toISOString().split("T")[0]}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Word-Export fehlgeschlagen");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Markengutachten_${reportData.trademarkName}_${new Date().toISOString().split("T")[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Word export error:", error);
      setExportError("Word-Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setIsExporting(false);
    }
  }, [reportContent, reportData.trademarkName]);

  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    setReportContent(e.currentTarget.innerHTML);
  }, []);

  if (!isOpen) return null;

  const riskColor = reportData.riskLevel === "high" ? "text-red-600" : reportData.riskLevel === "medium" ? "text-orange-500" : "text-green-600";
  const riskBg = reportData.riskLevel === "high" ? "bg-red-50" : reportData.riskLevel === "medium" ? "bg-orange-50" : "bg-green-50";
  const riskLabel = reportData.riskLevel === "high" ? "Hohes Risiko" : reportData.riskLevel === "medium" ? "Mittleres Risiko" : "Niedriges Risiko";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-teal-600 to-teal-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Markengutachten erstellen</h2>
                <p className="text-teal-100 text-sm">Professioneller Kollisionsbericht für „{reportData.trademarkName}"</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className={`px-6 py-3 ${riskBg} border-b flex items-center justify-between`}>
          <div className="flex items-center gap-6 text-sm">
            <span><strong>Marke:</strong> {reportData.trademarkName}</span>
            <span><strong>Klassen:</strong> {reportData.niceClasses.join(", ")}</span>
            <span><strong>Länder:</strong> {reportData.countries.join(", ")}</span>
            <span><strong>Konflikte:</strong> {reportData.conflicts.length}</span>
          </div>
          <div className={`flex items-center gap-2 font-bold ${riskColor}`}>
            <span className="text-2xl">{reportData.riskScore}%</span>
            <span className="text-sm">{riskLabel}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!reportContent ? (
            /* Generate Button */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Professionelles Gutachten generieren
                </h3>
                <p className="text-gray-500 mb-6">
                  Klicken Sie auf den Button, um ein vollständiges Markengutachten mit rechtlicher Analyse, 
                  Risikobewertung und Handlungsempfehlungen zu erstellen.
                </p>
                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Bericht wird erstellt...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Gutachten generieren
                    </>
                  )}
                </button>
                {exportError && (
                  <p className="mt-4 text-red-600 text-sm">{exportError}</p>
                )}
              </div>
            </div>
          ) : (
            /* Report Editor */
            <>
              {/* Toolbar */}
              <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isEditing ? "bg-teal-100 text-teal-700" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {isEditing ? "Fertig" : "Bearbeiten"}
                  </button>
                  <button
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                    Neu generieren
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={handleExportWord}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Word
                  </button>
                </div>
              </div>

              {/* Report Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
                <div 
                  ref={contentRef}
                  contentEditable={isEditing}
                  onInput={handleContentChange}
                  className={`max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-12 min-h-full prose prose-sm max-w-none ${
                    isEditing ? "ring-2 ring-teal-500 ring-offset-2" : ""
                  }`}
                  style={{ fontFamily: "Georgia, serif" }}
                  dangerouslySetInnerHTML={{ __html: reportContent }}
                />
              </div>

              {exportError && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-700 text-sm">
                  {exportError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportGenerator;
