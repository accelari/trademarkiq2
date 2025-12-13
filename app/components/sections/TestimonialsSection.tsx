import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote: "TrademarkIQ hat unseren Rechercheprozess revolutioniert. Was früher Stunden dauerte, erledigen wir jetzt in Minuten.",
    name: "Dr. Julia Weber",
    role: "Partnerin bei Weber & Kollegen Rechtsanwälte",
    initials: "JW",
    color: "bg-primary",
  },
  {
    quote: "Die KI-gestützte Analyse hat uns vor einer kostspieligen Markenkollision bewahrt. Absolut empfehlenswert!",
    name: "Michael Schneider",
    role: "CEO TechStart GmbH",
    initials: "MS",
    color: "bg-secondary",
  },
  {
    quote: "Endlich eine Plattform, die Markenrecherche auch für Nicht-Juristen verständlich macht.",
    name: "Anna Bauer",
    role: "Gründerin BrandLab",
    initials: "AB",
    color: "bg-accent-purple",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-accent-yellow text-accent-yellow" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="s-section bg-gradient-to-b from-gray-50 to-white">
      <div className="s-container">
        <div className="text-center mb-12">
          <span className="s-badge mb-4">Kundenstimmen</span>
          <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
            Was unsere Kunden sagen
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Erfahren Sie, wie TrademarkIQ Unternehmen dabei hilft, ihre Marken effizient zu schützen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-sm p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Quote className="w-5 h-5 text-primary" />
                </div>
                <StarRating />
              </div>

              <blockquote className="text-gray-700 leading-relaxed mb-6 flex-grow">
                "{testimonial.quote}"
              </blockquote>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div
                  className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center text-white font-semibold text-sm`}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
