import Link from "next/link";
import { 
  Globe, 
  Zap, 
  BarChart3, 
  Shield, 
  Bell, 
  FileText,
  ArrowRight 
} from "lucide-react";

export default function FeaturesPreview() {
  const features = [
    {
      icon: Globe,
      title: "Internationale Datenbanken",
      description: "DPMA, EUIPO und WIPO in einer Suche. Über 60 Millionen Marken.",
      color: "bg-primary",
    },
    {
      icon: Zap,
      title: "Sekundenschnelle Ergebnisse",
      description: "Keine Wartezeit. Erhalten Sie Ihre Analyse in unter 10 Sekunden.",
      color: "bg-secondary",
    },
    {
      icon: BarChart3,
      title: "Ähnlichkeitsanalyse",
      description: "KI-gestützte Bewertung phonetischer und visueller Ähnlichkeiten.",
      color: "bg-accent-green",
    },
    {
      icon: Shield,
      title: "DSGVO-konform",
      description: "100% deutscher Serverstandort. Ihre Daten bleiben in Deutschland.",
      color: "bg-accent-orange",
    },
    {
      icon: Bell,
      title: "Markenüberwachung",
      description: "Automatische Benachrichtigungen bei neuen ähnlichen Markenanmeldungen.",
      color: "bg-accent-sky",
    },
    {
      icon: FileText,
      title: "Exportierbare Berichte",
      description: "PDF-Reports für Ihre Unterlagen und zur Vorlage beim Anwalt.",
      color: "bg-accent-purple",
    },
  ];

  return (
    <section className="s-section bg-white">
      <div className="s-container">
        <div className="text-center mb-12">
          <span className="s-badge mb-4">Features</span>
          <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
            Alles was Sie für Ihre Markenrecherche brauchen
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Professionelle Tools, die bisher nur Anwaltskanzleien zur Verfügung standen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex gap-5 p-6 rounded-sm border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className={`${feature.color} w-14 h-14 min-w-[56px] rounded-sm flex items-center justify-center`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/features" className="s-link text-base">
            Alle Features entdecken
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
