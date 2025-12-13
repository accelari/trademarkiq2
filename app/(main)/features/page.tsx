import Link from "next/link";
import { 
  Search, 
  Shield, 
  BarChart3, 
  Globe, 
  Zap, 
  FileText, 
  Bell, 
  Users, 
  Lock,
  CheckCircle,
  ArrowRight
} from "lucide-react";

export default function FeaturesPage() {
  const mainFeatures = [
    {
      icon: Search,
      title: "KI-gestützte Markenrecherche",
      description: "Unsere fortschrittliche KI durchsucht DPMA, EUIPO und WIPO gleichzeitig und findet ähnliche Marken in Sekunden statt Stunden.",
      benefits: [
        "Phonetische Ähnlichkeitsanalyse",
        "Visuelle Markenvergleiche",
        "Semantische Bedeutungsanalyse",
        "Mehrsprachige Suche"
      ]
    },
    {
      icon: Shield,
      title: "Kollisionsrisiko-Bewertung",
      description: "Erhalten Sie eine detaillierte Risikoeinschätzung für potenzielle Markenkonflikte mit konkreten Handlungsempfehlungen.",
      benefits: [
        "Ampelsystem für schnelle Bewertung",
        "Detaillierte Konfliktanalyse",
        "Rechtliche Einordnung",
        "Prioritätsempfehlungen"
      ]
    },
    {
      icon: BarChart3,
      title: "Umfassende Berichte",
      description: "Professionelle PDF-Berichte für Mandanten, Investoren oder interne Dokumentation - exportbereit und rechtssicher.",
      benefits: [
        "White-Label-Option verfügbar",
        "Automatische Aktualisierung",
        "Exportformate: PDF, Excel, CSV",
        "Archivierung aller Recherchen"
      ]
    },
    {
      icon: Globe,
      title: "Internationale Abdeckung",
      description: "Recherchieren Sie nicht nur in Deutschland, sondern EU-weit und weltweit in über 100 Markenregistern.",
      benefits: [
        "DPMA (Deutschland)",
        "EUIPO (EU-weite Marken)",
        "WIPO (Internationale Marken)",
        "Nationale Register weltweit"
      ]
    },
    {
      icon: Zap,
      title: "Echtzeit-Ergebnisse",
      description: "Keine langen Wartezeiten mehr. Erhalten Sie umfassende Rechercheergebnisse in Sekunden, nicht Tagen.",
      benefits: [
        "Durchschnittlich 8 Sekunden",
        "Parallele Datenbankabfragen",
        "Live-Statusanzeige",
        "Sofortige Benachrichtigungen"
      ]
    },
    {
      icon: FileText,
      title: "Nizza-Klassifikation",
      description: "Automatische Klassifizierung und Empfehlung der relevanten Nizza-Klassen für Ihre Markenanmeldung.",
      benefits: [
        "45 Klassen abgedeckt",
        "Automatische Empfehlungen",
        "Klassenübergreifende Suche",
        "Historische Entwicklung"
      ]
    }
  ];

  const additionalFeatures = [
    {
      icon: Bell,
      title: "Markenüberwachung",
      description: "Werden Sie automatisch benachrichtigt, wenn neue ähnliche Marken angemeldet werden."
    },
    {
      icon: Users,
      title: "Team-Zusammenarbeit",
      description: "Arbeiten Sie mit Kollegen an Recherchen und teilen Sie Ergebnisse sicher."
    },
    {
      icon: Lock,
      title: "Datenschutz",
      description: "DSGVO-konform, gehostet in Deutschland, mit höchsten Sicherheitsstandards."
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container text-center">
          <span className="s-badge mb-6">Features</span>
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Alles, was Sie für Ihre{" "}
            <span className="text-primary">Markenrecherche</span> brauchen
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            TrademarkIQ kombiniert modernste KI-Technologie mit umfassender Datenbankabdeckung 
            für die gründlichste Markenrecherche am Markt.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="s-container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-primary/30"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="s-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Weitere Funktionen
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Zusätzliche Tools, die Ihre Markenrecherche noch effizienter machen.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg p-6 text-center"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-primary">
        <div className="s-container text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Bereit für professionelle Markenrecherche?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Starten Sie noch heute mit TrademarkIQ und schützen Sie Ihre Marke vor kostspieligen Konflikten.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/demo" className="s-button bg-white text-primary hover:bg-gray-100">
              Kostenlos testen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/preise" className="s-button s-button-secondary border-white text-white hover:bg-white/10">
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
