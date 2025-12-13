import { CheckCircle, Database, Clock, Shield } from "lucide-react";

export default function TrustBar() {
  const trustItems = [
    {
      icon: Database,
      text: "60+ Millionen Marken durchsuchbar",
    },
    {
      icon: CheckCircle,
      text: "DPMA • EUIPO • WIPO",
    },
    {
      icon: Clock,
      text: "Ergebnisse in unter 10 Sekunden",
    },
    {
      icon: Shield,
      text: "DSGVO-konform",
    },
  ];

  return (
    <section className="border-y border-gray-400 bg-white py-5">
      <div className="s-container">
        <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
          {trustItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
