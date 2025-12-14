"use client";

import { VoiceProvider } from "@humeai/voice-react";
import VoiceAssistant from "../VoiceAssistant";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CheckCircle } from "lucide-react";

interface CompactHeroSectionProps {
  accessToken: string;
  hasVoiceAssistant: boolean;
}

export default function CompactHeroSection({ 
  accessToken, 
  hasVoiceAssistant 
}: CompactHeroSectionProps) {
  return (
    <section className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-gray-50 to-white">
      <div className="s-container py-8 lg:py-12">
        <div className="text-center mb-8">
          <span className="s-badge mb-4">
            🇩🇪 Made & Hosted in Germany
          </span>
          <h1 className="text-3xl lg:text-5xl font-semibold text-gray-900 leading-tight mb-4">
            Markenrecherche mit{" "}
            <span className="text-primary">KI-Intelligenz</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Fragen Sie unseren KI-Markenberater – er analysiert DPMA, EUIPO und WIPO 
            in Sekunden und findet Namenskollisionen bevor Sie €5.000+ für Widersprüche zahlen.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mb-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>3 kostenlose Analysen</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Keine Kreditkarte</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>DSGVO-konform</span>
            </div>
          </div>
        </div>

        {hasVoiceAssistant ? (
          <VoiceProvider>
            <VoiceAssistant accessToken={accessToken} />
          </VoiceProvider>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-sm p-8 text-center shadow-sm">
            <p className="text-gray-600">
              Der Sprachassistent ist derzeit nicht verfügbar. 
              Bitte versuchen Sie es später erneut.
            </p>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-900">60+ Mio. Marken</p>
              <p className="text-xs text-gray-500">DPMA, EUIPO, WIPO</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Unter 10 Sek.</p>
              <p className="text-xs text-gray-500">Schnelle Analyse</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-900">100% DSGVO</p>
              <p className="text-xs text-gray-500">Deutsche Server</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-900">KI-Bewertung</p>
              <p className="text-xs text-gray-500">Kollisionsrisiko</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Oder erkunden Sie unsere Funktionen:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/features" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              Alle Features <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/preise" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              Preise <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/demo" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              Interaktive Demo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
