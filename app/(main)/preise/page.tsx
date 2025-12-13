import Link from "next/link";
import { Check, X, ArrowRight, HelpCircle } from "lucide-react";

export default function PreisePage() {
  const plans = [
    {
      name: "Starter",
      price: "49",
      period: "/Monat",
      description: "Für Einzelanwender und kleine Kanzleien",
      features: [
        { text: "10 Markenrecherchen/Monat", included: true },
        { text: "DPMA & EUIPO Abdeckung", included: true },
        { text: "PDF-Berichte", included: true },
        { text: "E-Mail-Support", included: true },
        { text: "WIPO-Recherche", included: false },
        { text: "Markenüberwachung", included: false },
        { text: "API-Zugang", included: false },
        { text: "White-Label-Berichte", included: false }
      ],
      cta: "Kostenlos starten",
      highlighted: false
    },
    {
      name: "Professional",
      price: "149",
      period: "/Monat",
      description: "Für wachsende Kanzleien und Unternehmen",
      features: [
        { text: "50 Markenrecherchen/Monat", included: true },
        { text: "DPMA, EUIPO & WIPO", included: true },
        { text: "PDF-Berichte", included: true },
        { text: "Prioritäts-Support", included: true },
        { text: "Markenüberwachung", included: true },
        { text: "Team-Funktionen (3 Nutzer)", included: true },
        { text: "API-Zugang", included: false },
        { text: "White-Label-Berichte", included: false }
      ],
      cta: "14 Tage kostenlos testen",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Individuell",
      period: "",
      description: "Für große Kanzleien und Unternehmen",
      features: [
        { text: "Unbegrenzte Recherchen", included: true },
        { text: "Alle Datenbanken weltweit", included: true },
        { text: "White-Label-Berichte", included: true },
        { text: "Dedizierter Account Manager", included: true },
        { text: "Unbegrenzte Nutzer", included: true },
        { text: "API-Zugang", included: true },
        { text: "SLA-Garantie", included: true },
        { text: "On-Premise Option", included: true }
      ],
      cta: "Kontakt aufnehmen",
      highlighted: false
    }
  ];

  const faqs = [
    {
      question: "Kann ich jederzeit kündigen?",
      answer: "Ja, alle Pläne können monatlich gekündigt werden. Es gibt keine langfristigen Verpflichtungen."
    },
    {
      question: "Was passiert nach der kostenlosen Testphase?",
      answer: "Nach 14 Tagen werden Sie automatisch auf den gewählten Plan umgestellt, sofern Sie nicht vorher kündigen."
    },
    {
      question: "Gibt es Rabatte für jährliche Zahlung?",
      answer: "Ja, bei jährlicher Zahlung erhalten Sie 2 Monate kostenlos - das entspricht 17% Ersparnis."
    },
    {
      question: "Kann ich den Plan später upgraden?",
      answer: "Natürlich! Sie können jederzeit auf einen höheren Plan wechseln. Der Upgrade erfolgt sofort."
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container text-center">
          <span className="s-badge mb-6">Preise</span>
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Transparente Preise,{" "}
            <span className="text-primary">keine versteckten Kosten</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Wählen Sie den Plan, der zu Ihren Anforderungen passt. 
            Alle Pläne beinhalten eine 14-tägige kostenlose Testphase.
          </p>
        </div>
      </section>

      <section className="py-8 lg:py-16">
        <div className="s-container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted 
                    ? "bg-primary text-white ring-4 ring-primary/20 scale-105" 
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Beliebteste Wahl
                  </span>
                )}
                <div className="text-center mb-6">
                  <h3 className={`text-xl font-semibold mb-2 ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-4 ${plan.highlighted ? "text-white/80" : "text-gray-600"}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className={`text-4xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
                      {plan.price === "Individuell" ? "" : "€"}{plan.price}
                    </span>
                    <span className={`ml-1 ${plan.highlighted ? "text-white/80" : "text-gray-600"}`}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-white" : "text-primary"}`} />
                      ) : (
                        <X className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-white/40" : "text-gray-300"}`} />
                      )}
                      <span className={`text-sm ${
                        feature.included 
                          ? (plan.highlighted ? "text-white" : "text-gray-700")
                          : (plan.highlighted ? "text-white/40" : "text-gray-400")
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={plan.name === "Enterprise" ? "/kontakt" : "/demo"}
                  className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-white text-primary hover:bg-gray-100"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="s-container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Häufige Fragen zu unseren Preisen
              </h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600 text-sm">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-primary">
        <div className="s-container text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Noch Fragen?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Unser Team hilft Ihnen gerne bei der Auswahl des richtigen Plans für Ihre Anforderungen.
          </p>
          <Link href="/kontakt" className="s-button bg-white text-primary hover:bg-gray-100">
            Kontakt aufnehmen
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>
    </main>
  );
}
