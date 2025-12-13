import { Search, Cpu, FileCheck, ArrowRight } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Markennamen eingeben",
      description: "Geben Sie Ihren gewünschten Markennamen ein und wählen Sie die relevanten Nizza-Klassen.",
      color: "bg-primary",
    },
    {
      number: "02",
      icon: Cpu,
      title: "KI-Analyse läuft",
      description: "Unsere KI durchsucht DPMA, EUIPO und WIPO nach ähnlichen Marken und Kollisionsrisiken.",
      color: "bg-secondary",
    },
    {
      number: "03",
      icon: FileCheck,
      title: "Ergebnisse erhalten",
      description: "Erhalten Sie einen detaillierten Bericht mit Risikoeinschätzung und Handlungsempfehlungen.",
      color: "bg-accent-green",
    },
  ];

  return (
    <section className="s-section bg-gray-100">
      <div className="s-container">
        <div className="text-center mb-12">
          <span className="s-badge mb-4">So funktioniert's</span>
          <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900">
            In 3 Schritten zur Markenklarheit
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-sm p-8 h-full">
                <div className={`${step.color} w-14 h-14 rounded-sm flex items-center justify-center mb-6`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                
                <span className="text-5xl font-bold text-gray-200 absolute top-4 right-6">
                  {step.number}
                </span>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
