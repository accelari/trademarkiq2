const partners = [
  { name: "TechStart", abbr: "TS" },
  { name: "BrandLab", abbr: "BL" },
  { name: "Weber & Kollegen", abbr: "W&K" },
  { name: "InnovateCorp", abbr: "IC" },
  { name: "DigitalFirst", abbr: "DF" },
];

export default function PartnerLogos() {
  return (
    <section className="s-section-sm bg-white border-t border-b border-gray-200">
      <div className="s-container">
        <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
          Vertrauen Sie unseren Partnern
        </p>

        <div className="relative">
          <div className="flex gap-8 md:gap-12 justify-start md:justify-center overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="flex items-center gap-2 shrink-0 px-4 py-2 bg-gray-50 rounded-sm border border-gray-200"
              >
                <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">{partner.abbr}</span>
                </div>
                <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
