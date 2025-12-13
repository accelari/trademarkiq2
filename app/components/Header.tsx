"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigation = [
    { name: "Features", href: "/features" },
    { name: "Preise", href: "/preise" },
    { name: "Über uns", href: "/ueber-uns" },
    { name: "Kontakt", href: "/kontakt" },
    { name: "FAQ", href: "/faq" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-400">
      <div className="s-container">
        <nav className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 py-1.5 px-2.5 -ml-2.5">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">TrademarkIQ</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-3 py-2.5 text-sm text-gray-900 hover:text-primary relative group"
              >
                {item.name}
                <span className="absolute bottom-1.5 left-3 right-3 h-0.5 bg-gray-900 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
            ))}

            <div className="relative ml-auto">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-100 rounded-sm"
              >
                Produkt
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-gray-100 border border-black/5 rounded-sm shadow-lg p-4 animate-fade-in">
                  <div className="space-y-3">
                    <Link href="/demo" className="block text-sm font-semibold text-gray-900 hover:text-primary">
                      Live-Demo
                    </Link>
                    <Link href="/uebersicht" className="block text-sm text-gray-600 hover:text-primary">
                      Produkt-Übersicht
                    </Link>
                    <Link href="/features" className="block text-sm text-gray-600 hover:text-primary">
                      Alle Features
                    </Link>
                    <Link href="/preise" className="block text-sm text-gray-600 hover:text-primary">
                      Preise & Pakete
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              className="ml-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-sm hover:bg-primary-hover transition-colors"
            >
              Kostenlos testen
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2"
            aria-label="Menü öffnen"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-3 text-base text-gray-900 hover:bg-gray-50 rounded-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <hr className="my-2 border-gray-200" />
              <Link
                href="/dashboard"
                className="mx-4 mt-2 px-4 py-3 bg-primary text-white text-center font-semibold rounded-sm hover:bg-primary-hover"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kostenlos testen
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
