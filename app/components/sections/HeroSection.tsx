import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="s-container py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <span className="s-badge mb-6">
              🇩🇪 Made & Hosted in Germany
            </span>
            
            <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 leading-tight mb-6">
              Markenrecherche mit{" "}
              <span className="text-primary">KI-Intelligenz</span>
            </h1>
            
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Finden Sie Namenskollisionen bevor Sie €5.000+ für Widersprüche zahlen. 
              DPMA, EUIPO und WIPO in Sekunden durchsuchen.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <Link href="/demo" className="s-button">
                Kostenlos testen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link href="#demo-video" className="s-button s-button-secondary flex items-center gap-2">
                <Play className="w-4 h-4" />
                Demo ansehen
              </Link>
            </div>
            
            <p className="text-sm text-gray-600">
              3 kostenlose Analysen • Keine Kreditkarte erforderlich
            </p>
          </div>
          
          <div className="relative">
            <div className="relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="/images/trademarkiq_hero_workspace_image.png"
                alt="TrademarkIQ Interface"
                width={800}
                height={450}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="absolute -z-10 top-8 right-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -z-10 bottom-8 left-8 w-48 h-48 bg-secondary/10 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
