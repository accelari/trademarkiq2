import Link from "next/link";
import Image from "next/image";
import { 
  Shield, 
  Award, 
  Users, 
  Globe,
  ArrowRight,
  CheckCircle,
  MapPin,
  Building
} from "lucide-react";

export default function UeberUnsPage() {
  const values = [
    {
      icon: Shield,
      title: "Datenschutz first",
      description: "Wir speichern und verarbeiten alle Daten ausschließlich in Deutschland - DSGVO-konform und mit höchsten Sicherheitsstandards."
    },
    {
      icon: Award,
      title: "Qualität ohne Kompromisse",
      description: "Unsere KI wird kontinuierlich von Markenrechtsexperten trainiert und validiert, um höchste Genauigkeit zu gewährleisten."
    },
    {
      icon: Users,
      title: "Kundenorientierung",
      description: "Wir entwickeln TrademarkIQ in enger Zusammenarbeit mit unseren Kunden, um deren Bedürfnisse optimal zu erfüllen."
    },
    {
      icon: Globe,
      title: "Innovation",
      description: "Wir nutzen modernste KI-Technologie, um Markenrecherche schneller, günstiger und zugänglicher zu machen."
    }
  ];

  const milestones = [
    { year: "2023", event: "Gründung der ACCELARI GmbH" },
    { year: "2023", event: "Erste Beta-Version von TrademarkIQ" },
    { year: "2024", event: "Offizieller Launch mit DPMA-Integration" },
    { year: "2024", event: "Erweiterung um EUIPO & WIPO" },
    { year: "2025", event: "KI-Sprachassistent Markenberater" }
  ];

  const stats = [
    { number: "10.000+", label: "Durchgeführte Recherchen" },
    { number: "500+", label: "Zufriedene Kunden" },
    { number: "99,9%", label: "Systemverfügbarkeit" },
    { number: "<10s", label: "Durchschnittliche Suchzeit" }
  ];

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container">
          <div className="max-w-3xl mx-auto text-center">
            <span className="s-badge mb-6">Über uns</span>
            <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
              Wir machen{" "}
              <span className="text-primary">Markenrecherche</span>{" "}
              zugänglich
            </h1>
            <p className="text-lg text-gray-700">
              TrademarkIQ ist ein Produkt der ACCELARI GmbH - einem deutschen Technologieunternehmen, 
              das sich auf KI-gestützte Lösungen für den rechtlichen Bereich spezialisiert hat.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="s-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-6">
                Unsere Mission
              </h2>
              <p className="text-gray-700 mb-4">
                Markenrecherche war lange Zeit teuer, zeitaufwendig und nur großen Unternehmen 
                und spezialisierten Kanzleien zugänglich. Das ändern wir.
              </p>
              <p className="text-gray-700 mb-4">
                Mit TrademarkIQ demokratisieren wir den Zugang zu professioneller Markenrecherche. 
                Unsere KI-gestützte Plattform ermöglicht es jedem Unternehmen - vom Startup bis 
                zum Konzern - fundierte Entscheidungen bei der Markenwahl zu treffen.
              </p>
              <p className="text-gray-700">
                Unser Ziel: Keine Marke mehr, die aufgrund mangelnder Recherche in kostspielige 
                Rechtsstreitigkeiten gerät.
              </p>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="s-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Unsere Werte
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Diese Prinzipien leiten uns bei allem, was wir tun.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="s-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-6">
                ACCELARI GmbH
              </h2>
              <p className="text-gray-700 mb-6">
                Die ACCELARI GmbH mit Sitz in Deutschland entwickelt innovative 
                Softwarelösungen für den Rechtsmarkt. Unser Fokus liegt auf der 
                Anwendung von künstlicher Intelligenz zur Automatisierung und 
                Verbesserung von rechtlichen Prozessen.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Firmensitz</div>
                    <div className="text-gray-600 text-sm">Deutschland</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Datenverarbeitung</div>
                    <div className="text-gray-600 text-sm">100% in Deutschland</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Zertifizierungen</div>
                    <div className="text-gray-600 text-sm">DSGVO-konform, ISO 27001</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary/5 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Meilensteine
              </h3>
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {milestone.year}
                    </span>
                    <span className="text-gray-700">{milestone.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-primary">
        <div className="s-container text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Werden Sie Teil unserer Geschichte
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Schließen Sie sich den über 500 Unternehmen an, die bereits auf TrademarkIQ vertrauen.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="s-button bg-white text-primary hover:bg-gray-100">
              Kostenlos testen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/kontakt" className="s-button s-button-secondary border-white text-white hover:bg-white/10">
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
