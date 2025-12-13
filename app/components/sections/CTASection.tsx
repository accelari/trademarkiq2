import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function CTASection() {
  const benefits = [
    "3 kostenlose Markenrecherchen",
    "Keine Kreditkarte erforderlich",
    "Sofort einsatzbereit",
  ];

  return (
    <section className="s-section bg-primary">
      <div className="s-container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-4">
            Bereit für Ihre erste Markenrecherche?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Starten Sie jetzt kostenlos und erfahren Sie in Sekunden, 
            ob Ihr Wunschname verfügbar ist.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-white/90 text-sm"
              >
                <CheckCircle className="w-4 h-4 text-white" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-primary font-semibold rounded-sm hover:bg-gray-100 transition-colors"
            >
              Jetzt kostenlos starten
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/preise"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-sm hover:bg-white/10 transition-colors"
            >
              Alle Preise ansehen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
