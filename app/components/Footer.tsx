import Link from "next/link";
import { Linkedin, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    produkt: [
      { name: "Features", href: "/features" },
      { name: "Preise", href: "/preise" },
      { name: "Live-Demo", href: "/demo" },
      { name: "FAQ", href: "/faq" },
    ],
    unternehmen: [
      { name: "Über uns", href: "/ueber-uns" },
      { name: "Kontakt", href: "/kontakt" },
      { name: "Karriere", href: "/karriere" },
    ],
    rechtliches: [
      { name: "Impressum", href: "/impressum" },
      { name: "Datenschutz", href: "/datenschutz" },
      { name: "AGB", href: "/agb" },
    ],
  };

  return (
    <footer className="bg-gray-200 mt-10">
      <div className="s-container py-9">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <span className="text-white font-bold text-sm">TM</span>
              </div>
              <span className="font-semibold text-lg text-gray-900">TrademarkIQ</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              KI-gestützte Markenrecherche für den deutschen Mittelstand. 
              Schnell, präzise und DSGVO-konform.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg">🇩🇪</span>
              <span>Made & Hosted in Germany</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-600 mb-4">Produkt</h3>
            <ul className="space-y-2">
              {footerLinks.produkt.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-600 hover:text-primary hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-600 mb-4">Unternehmen</h3>
            <ul className="space-y-2">
              {footerLinks.unternehmen.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-600 hover:text-primary hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-600 mb-4">Rechtliches</h3>
            <ul className="space-y-2">
              {footerLinks.rechtliches.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-600 hover:text-primary hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-600 mb-4">Kontakt</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@accelari.com"
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary"
                >
                  <Mail className="w-4 h-4" />
                  info@accelari.com
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/company/accelari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300">
        <div className="s-container py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {currentYear} ACCELARI GmbH. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-gray-600">
            TrademarkIQ ist ein Recherche-Tool und ersetzt keine Rechtsberatung.
          </p>
        </div>
      </div>
    </footer>
  );
}
