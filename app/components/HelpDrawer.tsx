"use client";

import { X, Mic, MessageSquare, FileText, Zap, FolderOpen, Play, ChevronDown, ChevronUp, Hash, ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConsultation?: () => void;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function HelpDrawer({ isOpen, onClose, onStartConsultation }: HelpDrawerProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("erste-schritte");

  const sections: Section[] = [
    {
      id: "erste-schritte",
      title: "Erste Schritte",
      icon: <Play className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Willkommen bei der KI-gestützten Markenberatung! So starten Sie:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Eingabemethode wählen:</strong> Entscheiden Sie, ob Sie per Sprache oder Text mit Klaus kommunizieren möchten.</li>
            <li><strong>Auf "Starten" klicken:</strong> Aktivieren Sie den Sprachassistenten mit dem grünen Start-Button.</li>
            <li><strong>Frage stellen:</strong> Sprechen oder tippen Sie Ihre Frage zum Markenrecht.</li>
            <li><strong>Antwort erhalten:</strong> Klaus antwortet Ihnen in Echtzeit.</li>
            <li><strong>Fallnummer:</strong> Automatisch wird eine eindeutige Fallnummer generiert (z.B. TM-20251208-143025).</li>
          </ol>
          <div className="bg-primary/10 rounded-lg p-3 mt-3">
            <p className="text-primary font-medium">Tipp:</p>
            <p className="text-gray-700">Die Beratung wird automatisch protokolliert. Am Ende können Sie einen Bericht erstellen.</p>
          </div>
        </div>
      ),
    },
    {
      id: "eingabemethoden",
      title: "Eingabemethoden",
      icon: <Mic className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-primary" />
              <span className="font-medium text-gray-900">Sprechen</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Klicken Sie auf "Starten" um das Mikrofon zu aktivieren</li>
              <li>Sprechen Sie Ihre Frage deutlich und in normaler Geschwindigkeit</li>
              <li>Der Assistent antwortet per Sprachausgabe</li>
              <li>Ideal für natürliche, fließende Gespräche</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium text-gray-900">Tippen</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Schreiben Sie Ihre Frage ins Textfeld</li>
              <li>Drücken Sie Enter oder den Senden-Button</li>
              <li>Antworten erscheinen als Text</li>
              <li>Ideal für detaillierte oder komplexe Fragen</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "bericht-erstellen",
      title: "Bericht erstellen",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Am Ende Ihrer Beratung können Sie einen strukturierten Bericht erstellen lassen:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Beratung führen:</strong> Stellen Sie alle Ihre Fragen zum Markenrecht.</li>
            <li><strong>"Bericht erstellen" klicken:</strong> Die KI analysiert das Gespräch.</li>
            <li><strong>Zusammenfassung erhalten:</strong> Der Bericht enthält:
              <ul className="list-disc list-inside ml-4 mt-1 text-gray-500">
                <li>Besprochene Themen</li>
                <li>Wichtige Erkenntnisse</li>
                <li>Empfehlungen</li>
                <li>Nächste Schritte</li>
              </ul>
            </li>
            <li><strong>Speichern:</strong> Der Bericht wird automatisch gespeichert und kann später abgerufen werden.</li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-amber-800 font-medium">Hinweis:</p>
            <p className="text-amber-700">Nach 2 Minuten Inaktivität wird die Beratung automatisch gespeichert.</p>
          </div>
        </div>
      ),
    },
    {
      id: "schnellfragen",
      title: "Schnellfragen",
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Schnellfragen sind vordefinierte Fragen, die häufig gestellt werden:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Zeitersparnis:</strong> Klicken Sie einfach auf eine Schnellfrage statt zu tippen.</li>
            <li><strong>Inspiration:</strong> Die Fragen helfen Ihnen, wichtige Themen nicht zu vergessen.</li>
            <li><strong>Expertenwissen:</strong> Die Fragen wurden von Markenrechtsexperten zusammengestellt.</li>
          </ul>
          <div className="bg-gray-50 rounded-lg p-3 mt-3">
            <p className="text-gray-700 font-medium mb-2">Beispiel-Schnellfragen:</p>
            <div className="space-y-1 text-xs">
              <div className="bg-white px-2 py-1 rounded border border-gray-200">"Was kostet eine Markenanmeldung beim DPMA?"</div>
              <div className="bg-white px-2 py-1 rounded border border-gray-200">"Welche Nizza-Klassen brauche ich?"</div>
              <div className="bg-white px-2 py-1 rounded border border-gray-200">"Wie lange dauert der Markenschutz?"</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "meine-markenfaelle",
      title: "Meine Markenfälle",
      icon: <FolderOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Alle Ihre Markenfälle werden gespeichert und sind jederzeit abrufbar:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Zugriff:</strong> Klicken Sie auf "Meine Markenfälle" oben rechts.</li>
            <li><strong>Übersicht:</strong> Sehen Sie alle Fälle mit Fallnummer, Status und Fortschritt.</li>
            <li><strong>Details:</strong> Klicken Sie auf einen Fall, um die vollständige Übersicht zu sehen.</li>
            <li><strong>Löschen:</strong> Nicht mehr benötigte Fälle können gelöscht werden.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "fallnummer",
      title: "Fallnummer-System",
      icon: <Hash className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Jede Beratung erhält automatisch eine eindeutige Fallnummer:</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-mono text-lg text-center text-primary mb-2">TM-20251208-143025</p>
            <ul className="text-xs space-y-1">
              <li><strong>TM</strong> = TrademarkIQ</li>
              <li><strong>20251208</strong> = Datum (8. Dezember 2025)</li>
              <li><strong>143025</strong> = Uhrzeit (14:30:25 Uhr)</li>
            </ul>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 mt-3">
            <p className="text-primary font-medium">Vorteile:</p>
            <ul className="text-gray-700 text-sm list-disc list-inside">
              <li>Eindeutige Identifikation jeder Beratung</li>
              <li>Chronologisch sortierbar</li>
              <li>Professionelles Format nach ISO-Standard</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "weiter-recherche",
      title: "Weiter zur Recherche",
      icon: <ArrowRight className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Nach der Beratung können Sie nahtlos zur Markenrecherche wechseln:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Beratung führen:</strong> Besprechen Sie mit Klaus Ihren Markennamen, Länder und Nizza-Klassen.</li>
            <li><strong>Daten erfassen:</strong> Klaus erkennt automatisch die relevanten Informationen.</li>
            <li><strong>"Weiter zur Recherche":</strong> Klicken Sie auf den Button, um zum Formular zu wechseln.</li>
            <li><strong>Vorausgefüllt:</strong> Die erkannten Daten werden automatisch ins Formular übernommen.</li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-amber-800 font-medium">Hinweis:</p>
            <p className="text-amber-700">Der Button wird erst aktiv, nachdem Sie mindestens eine Frage gestellt haben.</p>
          </div>
        </div>
      ),
    },
    {
      id: "guided-tour",
      title: "Guided Tour",
      icon: <MapPin className="w-5 h-5" />,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Bei Ihrem ersten Besuch führt Sie eine interaktive Tour durch die Oberfläche:</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900 mb-2">Die 6 Schritte:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Eingabemethode wählen</li>
              <li>Beratung starten</li>
              <li>Fragen stellen oder Schnellfragen nutzen</li>
              <li>Protokoll verfolgen</li>
              <li>Bericht erstellen</li>
              <li>Weiter zur Recherche</li>
            </ol>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 mt-3">
            <p className="text-primary font-medium">Tour wiederholen:</p>
            <p className="text-gray-700">Sie können die Tour jederzeit über den "?" Button oben rechts neu starten.</p>
          </div>
        </div>
      ),
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary to-teal-600">
            <div>
              <h2 className="text-lg font-semibold text-white">Hilfe & Anleitungen</h2>
              <p className="text-sm text-white/80">Markenberatung verstehen</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                      expandedSection === section.id
                        ? "bg-primary/5 border-b border-gray-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        expandedSection === section.id
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {section.icon}
                      </div>
                      <span className={`font-medium ${
                        expandedSection === section.id ? "text-primary" : "text-gray-900"
                      }`}>
                        {section.title}
                      </span>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronUp className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedSection === section.id && (
                    <div className="p-4 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                      {section.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-br from-primary/10 to-teal-50 rounded-xl border border-primary/20">
              <h3 className="font-medium text-gray-900 mb-2">Noch Fragen?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Starten Sie einfach eine Beratung und fragen Sie unseren KI-Assistenten direkt!
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onStartConsultation) {
                    onStartConsultation();
                  }
                }}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Beratung starten
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
