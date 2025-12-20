"use client";

import {
  Lightbulb,
  Wand2,
  PenLine,
  Phone,
  FileDown,
  ArrowRight,
  Sparkles,
  Scale,
  AlertTriangle
} from "lucide-react";

export type RiskLevel = "low" | "medium" | "high";

interface RecommendedActionProps {
  riskLevel: RiskLevel;
  onGenerateAlternatives: () => void;
  onEnterOwn: () => void;
  onContactLawyer: () => void;
  onDownloadPDF: () => void;
  onProceedToRegistration?: () => void;
}

export function RecommendedAction({
  riskLevel,
  onGenerateAlternatives,
  onEnterOwn,
  onContactLawyer,
  onDownloadPDF,
  onProceedToRegistration,
}: RecommendedActionProps) {
  // Configuration based on risk level
  const configs = {
    low: {
      title: "Gute Nachrichten!",
      subtitle: "Die Marke scheint verfügbar zu sein.",
      icon: Sparkles,
      iconBg: "bg-green-500",
      containerBg: "bg-gradient-to-br from-green-50 to-emerald-50",
      containerBorder: "border-green-200",
      primaryAction: {
        label: "Zur Markenanmeldung",
        icon: ArrowRight,
        onClick: onProceedToRegistration,
        bg: "bg-green-600 hover:bg-green-700",
      },
      secondaryActions: [
        { label: "Anwalt kontaktieren", icon: Phone, onClick: onContactLawyer },
        { label: "PDF herunterladen", icon: FileDown, onClick: onDownloadPDF },
      ],
      infoText: "Wir empfehlen dennoch eine professionelle Prüfung vor der Anmeldung.",
    },
    medium: {
      title: "Prüfung empfohlen",
      subtitle: "Es gibt potenzielle Konflikte, die geprüft werden sollten.",
      icon: Scale,
      iconBg: "bg-yellow-500",
      containerBg: "bg-gradient-to-br from-yellow-50 to-orange-50",
      containerBorder: "border-yellow-200",
      primaryAction: {
        label: "Anwalt kontaktieren",
        icon: Phone,
        onClick: onContactLawyer,
        bg: "bg-yellow-600 hover:bg-yellow-700",
      },
      secondaryActions: [
        { label: "Alternativen generieren", icon: Wand2, onClick: onGenerateAlternatives },
        { label: "Eigenen Namen eingeben", icon: PenLine, onClick: onEnterOwn },
        { label: "PDF herunterladen", icon: FileDown, onClick: onDownloadPDF },
      ],
      infoText: "Eine Anmeldung ist möglich, aber die Konflikte sollten von einem Experten bewertet werden.",
    },
    high: {
      title: "Alternative Namen finden",
      subtitle: "Die aktuelle Marke hat hohe Konfliktwahrscheinlichkeit.",
      icon: Lightbulb,
      iconBg: "bg-red-500",
      containerBg: "bg-gradient-to-br from-red-50 to-orange-50",
      containerBorder: "border-red-200",
      primaryAction: null,
      alternativeActions: [
        {
          label: "KI-Vorschläge generieren",
          icon: Wand2,
          onClick: onGenerateAlternatives,
          bg: "bg-primary hover:bg-primary/90",
          description: "Lassen Sie sich kreative Alternativen vorschlagen"
        },
        {
          label: "Eigenen Namen eingeben",
          icon: PenLine,
          onClick: onEnterOwn,
          bg: "bg-gray-700 hover:bg-gray-800",
          description: "Prüfen Sie Ihren eigenen Alternativnamen"
        },
      ],
      secondaryActions: [
        { label: "Anwalt kontaktieren", icon: Phone, onClick: onContactLawyer },
        { label: "PDF herunterladen", icon: FileDown, onClick: onDownloadPDF },
      ],
      infoText: null,
      warningText: "Eine Anmeldung wird wahrscheinlich abgelehnt oder angefochten.",
    },
  };

  const config = configs[riskLevel];
  const Icon = config.icon;

  return (
    <div className={`${config.containerBg} ${config.containerBorder} border-2 rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${config.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-600">{config.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Warning for high risk */}
        {riskLevel === "high" && "warningText" in config && config.warningText && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{config.warningText}</p>
          </div>
        )}

        {/* Primary Action for low/medium risk */}
        {config.primaryAction && (
          <button
            onClick={config.primaryAction.onClick}
            className={`w-full ${config.primaryAction.bg} text-white font-semibold rounded-xl px-6 py-4 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all`}
          >
            <config.primaryAction.icon className="w-5 h-5" />
            {config.primaryAction.label}
          </button>
        )}

        {/* Alternative Actions for high risk */}
        {riskLevel === "high" && "alternativeActions" in config && config.alternativeActions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.alternativeActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`${action.bg} text-white rounded-xl p-4 text-left transition-all hover:shadow-lg group`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <action.icon className="w-5 h-5" />
                  <span className="font-semibold">{action.label}</span>
                </div>
                <p className="text-sm text-white/80">{action.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Info text */}
        {config.infoText && (
          <p className="text-sm text-gray-600 text-center">{config.infoText}</p>
        )}

        {/* Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-200/50">
          <span className="text-xs text-gray-500">Oder:</span>
          {config.secondaryActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecommendedAction;
