import { AlertTriangle } from "lucide-react";

export default function ProblemSection() {
  const stats = [
    {
      value: "€5.000+",
      description: "Durchschnittliche Kosten bei einer Markenkollision",
    },
    {
      value: "30%",
      description: "der Markenanmeldungen scheitern an Widersprüchen",
    },
    {
      value: "3-5 Tage",
      description: "Wartezeit bei klassischen professionellen Recherchen",
    },
  ];

  return (
    <section className="s-section bg-white">
      <div className="s-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
            Markenanmeldung ohne Recherche?{" "}
            <span className="text-accent-red">Teurer Fehler.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-red-50 border-l-4 border-accent-red rounded-r-sm p-6"
            >
              <p className="text-4xl lg:text-5xl font-semibold text-accent-red mb-3">
                {stat.value}
              </p>
              <p className="text-gray-800 leading-relaxed">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center mt-10 text-lg text-gray-700">
          Eine 10-Minuten-Recherche mit TrademarkIQ kann das verhindern.
        </p>
      </div>
    </section>
  );
}
