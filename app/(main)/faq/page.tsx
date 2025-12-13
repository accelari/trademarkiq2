"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, ArrowRight } from "lucide-react";

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    {
      name: "Allgemeine Fragen",
      faqs: [
        {
          question: "Was ist TrademarkIQ?",
          answer: "TrademarkIQ ist eine KI-gestützte Plattform für professionelle Markenrecherche. Wir durchsuchen automatisch die wichtigsten Markenregister (DPMA, EUIPO, WIPO) und analysieren potenzielle Kollisionsrisiken, bevor Sie Ihre Marke anmelden."
        },
        {
          question: "Für wen ist TrademarkIQ geeignet?",
          answer: "TrademarkIQ richtet sich an Unternehmen jeder Größe, Gründer, Markenrechtsanwälte, Agenturen und jeden, der vor einer Markenanmeldung eine fundierte Recherche durchführen möchte. Unsere Pläne sind skalierbar von Einzelnutzern bis zu Enterprise-Kunden."
        },
        {
          question: "Welche Markenregister werden durchsucht?",
          answer: "TrademarkIQ durchsucht das Deutsche Patent- und Markenamt (DPMA), das Amt der Europäischen Union für geistiges Eigentum (EUIPO) und die Weltorganisation für geistiges Eigentum (WIPO). Je nach Plan haben Sie Zugang zu unterschiedlichen Registern."
        },
        {
          question: "Wie genau ist die KI-Analyse?",
          answer: "Unsere KI wurde speziell für Markenrecherche trainiert und erreicht eine Trefferquote von über 95% bei der Identifikation relevanter ähnlicher Marken. Die Analyse berücksichtigt phonetische, visuelle und semantische Ähnlichkeiten."
        }
      ]
    },
    {
      name: "Funktionen & Nutzung",
      faqs: [
        {
          question: "Wie funktioniert eine Markenrecherche?",
          answer: "Geben Sie einfach Ihren gewünschten Markennamen ein und wählen Sie die relevanten Nizza-Klassen aus. Unsere KI durchsucht dann automatisch die Markenregister und präsentiert Ihnen eine übersichtliche Analyse mit Risikobewertung innerhalb von Sekunden."
        },
        {
          question: "Was sind Nizza-Klassen?",
          answer: "Die Nizza-Klassifikation ist ein internationales System zur Kategorisierung von Waren und Dienstleistungen für die Markenregistrierung. Es gibt 45 Klassen (1-34 für Waren, 35-45 für Dienstleistungen). TrademarkIQ hilft Ihnen bei der Auswahl der richtigen Klassen."
        },
        {
          question: "Kann ich Berichte exportieren?",
          answer: "Ja, alle Rechercheergebnisse können als professionelle PDF-Berichte exportiert werden. Enterprise-Kunden haben zusätzlich die Möglichkeit, White-Label-Berichte zu erstellen und Ergebnisse in verschiedenen Formaten (PDF, Excel, CSV) zu exportieren."
        },
        {
          question: "Was ist der KI-Sprachassistent?",
          answer: "Unser Markenberater ist ein KI-Sprachassistent, der Ihnen bei Fragen zur Markenrecherche hilft. Sie können direkt mit ihm sprechen und erhalten Antworten auf Ihre Fragen zu Markenschutz, Recherche und Anmeldeprozessen."
        }
      ]
    },
    {
      name: "Preise & Abrechnung",
      faqs: [
        {
          question: "Gibt es eine kostenlose Testversion?",
          answer: "Ja, alle Pläne beinhalten eine 14-tägige kostenlose Testphase. Sie können TrademarkIQ vollständig testen, bevor Sie sich für einen Plan entscheiden. Keine Kreditkarte erforderlich für den Start."
        },
        {
          question: "Kann ich jederzeit kündigen?",
          answer: "Ja, alle Pläne sind monatlich kündbar. Es gibt keine langfristigen Verpflichtungen. Die Kündigung wird zum Ende des aktuellen Abrechnungszeitraums wirksam."
        },
        {
          question: "Welche Zahlungsmethoden werden akzeptiert?",
          answer: "Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, American Express), SEPA-Lastschrift und PayPal. Enterprise-Kunden können auch per Rechnung bezahlen."
        },
        {
          question: "Gibt es Rabatte?",
          answer: "Bei jährlicher Zahlung erhalten Sie 2 Monate kostenlos - das entspricht 17% Ersparnis. Für größere Teams und Enterprise-Kunden bieten wir individuelle Preise an."
        }
      ]
    },
    {
      name: "Datenschutz & Sicherheit",
      faqs: [
        {
          question: "Wo werden meine Daten gespeichert?",
          answer: "Alle Daten werden ausschließlich auf Servern in Deutschland gespeichert und verarbeitet. Wir arbeiten mit zertifizierten Rechenzentren, die höchsten Sicherheitsstandards entsprechen."
        },
        {
          question: "Ist TrademarkIQ DSGVO-konform?",
          answer: "Ja, TrademarkIQ ist vollständig DSGVO-konform. Wir haben umfangreiche technische und organisatorische Maßnahmen implementiert, um den Schutz Ihrer Daten zu gewährleisten."
        },
        {
          question: "Wer hat Zugriff auf meine Recherchen?",
          answer: "Nur Sie und von Ihnen autorisierte Team-Mitglieder haben Zugriff auf Ihre Recherchen. Unsere Mitarbeiter haben keinen Zugriff auf Ihre Rechercheergebnisse ohne Ihre ausdrückliche Genehmigung."
        }
      ]
    }
  ];

  const allFaqs = categories.flatMap((cat) => 
    cat.faqs.map((faq) => ({ ...faq, category: cat.name }))
  );

  const filteredFaqs = searchTerm
    ? allFaqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container text-center">
          <span className="s-badge mb-6">FAQ</span>
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Häufig gestellte{" "}
            <span className="text-primary">Fragen</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
            Finden Sie Antworten auf die häufigsten Fragen zu TrademarkIQ und Markenrecherche.
          </p>
          
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen Sie nach Fragen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="s-container">
          {searchTerm && filteredFaqs ? (
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-600 mb-6">
                {filteredFaqs.length} Ergebnis{filteredFaqs.length !== 1 ? "se" : ""} für &ldquo;{searchTerm}&rdquo;
              </p>
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(openIndex === index ? null : index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <span className="text-xs text-primary font-medium">{faq.category}</span>
                        <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          openIndex === index ? "rotate-180" : ""
                        }`} 
                      />
                    </button>
                    {openIndex === index && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-12">
              {categories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    {category.name}
                  </h2>
                  <div className="space-y-4">
                    {category.faqs.map((faq, faqIndex) => {
                      const globalIndex = categories
                        .slice(0, catIndex)
                        .reduce((acc, cat) => acc + cat.faqs.length, 0) + faqIndex;
                      
                      return (
                        <div key={faqIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setOpenIndex(openIndex === globalIndex ? null : globalIndex)}
                            className="w-full px-6 py-4 text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                          >
                            <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                            <ChevronDown 
                              className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                                openIndex === globalIndex ? "rotate-180" : ""
                              }`} 
                            />
                          </button>
                          {openIndex === globalIndex && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                              <p className="text-gray-600">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="s-container text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ihre Frage nicht gefunden?
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Kontaktieren Sie unser Team oder nutzen Sie unseren KI-Sprachassistenten für sofortige Antworten.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/kontakt" className="s-button">
              Kontakt aufnehmen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/#voice-assistant" className="s-button s-button-secondary">
              KI-Assistent fragen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
