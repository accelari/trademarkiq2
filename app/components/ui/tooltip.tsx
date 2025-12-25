"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  term: string;
  explanation?: string;
  children?: React.ReactNode;
  className?: string;
}

const tooltipDefinitions: Record<string, { title: string; explanation: string }> = {
  "niceClasses": {
    title: "Nice Classes",
    explanation: "Die Nizza-Klassifikation teilt Waren und Dienstleistungen in 45 Klassen ein. Jede Klasse repräsentiert eine bestimmte Kategorie von Produkten/Dienstleistungen. Beispiel: Klasse 25 = Kleidung, Klasse 9 = Software."
  },
  "riskLevel": {
    title: "Risk Level",
    explanation: "Bewertet das Konfliktrisiko Ihrer Marke: 🟢 GRÜN = Geringes Risiko (sicher), 🟡 GELB = Mittleres Risiko (Vorsicht), 🔴 ROT = Hohes Risiko (gefährdet). Basierend auf vorhandenen Markenkonflikten."
  },
  "riskScore": {
    title: "Risk Score",
    explanation: "Prozentuale Bewertung des Konfliktrisikos von 0-100%. 0% = keine Konflikte, 100% = sehr hohe Konfliktwahrscheinlichkeit. Hilft bei schnellen Entscheidungen."
  },
  "alternativeNames": {
    title: "Alternative Names",
    explanation: "KI-generierte Markennamen-Alternativen mit ähnlicher Bedeutung aber geringerem Konfliktrisiko. Jeder Vorschlag wird auf Verfügbarkeit geprüft."
  },
  "quickCheck": {
    title: "Quick Check",
    explanation: "Schnelle Vorab-Prüfung eines Markennamens auf offensichtliche Konflikte. Ersetzt keine vollständige Recherche, aber gibt erste Hinweise."
  },
  "conflicts": {
    title: "Konflikte",
    explanation: "Bereits existierende Marken, die ähnlich sind und rechtliche Probleme verursachen könnten. Wichtig: Nicht jeder Konflikt bedeutet automatisch Ablehnung!"
  },
  "trademarkSearch": {
    title: "Markenrecherche",
    explanation: "Systematische Suche nach ähnlichen Marken in Datenbanken von Patentämtern. Essentiell um Rechtsstreitigkeiten zu vermeiden."
  },
  "priority": {
    title: "Priorität",
    explanation: "Bewertet die Dringlichkeit: Hoch = sofort handeln, Mittel = bald erledigen, Niedrig = kann warten. Basierend auf Fristen und Wichtigkeit."
  },
  "deadline": {
    title: "Frist",
    explanation: "Zeitpunkt bis zu dem eine Handlung erforderlich ist. Im Markenrecht kritisch - verpasste Fristen können Verlust von Rechten bedeuten!"
  },
  "status": {
    title: "Status",
    explanation: "Aktueller Bearbeitungszustand: Ausstehend = noch nicht begonnen, In Arbeit = wird bearbeitet, Abgeschlossen = erledigt, Übersprungen = bewusst ignoriert."
  }
};

export default function Tooltip({ term, explanation, children, className = "" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const definition = tooltipDefinitions[term];

  const content = (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
      <span
        role="button"
        tabIndex={0}
        aria-label="Hilfe"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(!isVisible);
          }
        }}
        className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-3 h-3" />
      </span>
    </span>
  );

  if (!isVisible) {
    return content;
  }

  return (
    <span className="relative inline-flex items-center gap-1">
      {content}
      <div className="absolute z-50 w-80 p-3 mt-8 -ml-40 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700">
        <div className="font-semibold mb-1">
          {definition?.title || term}
        </div>
        <div className="text-gray-300 leading-relaxed">
          {explanation || definition?.explanation}
        </div>
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
      </div>
    </span>
  );
}

// Convenience components for common terms
export function NiceClassesTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="niceClasses" className={className}>{children}</Tooltip>;
}

export function RiskLevelTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="riskLevel" className={className}>{children}</Tooltip>;
}

export function RiskScoreTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="riskScore" className={className}>{children}</Tooltip>;
}

export function AlternativeNamesTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="alternativeNames" className={className}>{children}</Tooltip>;
}

export function QuickCheckTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="quickCheck" className={className}>{children}</Tooltip>;
}

export function ConflictsTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="conflicts" className={className}>{children}</Tooltip>;
}

export function StatusTooltip({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Tooltip term="status" className={className}>{children}</Tooltip>;
}
