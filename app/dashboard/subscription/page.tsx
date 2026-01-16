"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Zap, Crown, CreditCard, ExternalLink, Calendar, TrendingDown, Plus, History } from "lucide-react";

// Demo-Daten (später aus DB)
const DEMO_USAGE_HISTORY = [
  { id: 1, action: "Markenrecherche", target: "TechBrand", credits: -5, date: "Heute, 14:30" },
  { id: 2, action: "KI-Analyse", target: "TechBrand", credits: -5, date: "Heute, 14:32" },
  { id: 3, action: "Logo-Generierung", target: "TechBrand", credits: -4, date: "Heute, 15:00" },
  { id: 4, action: "Markenrecherche", target: "CloudSync", credits: -5, date: "Gestern, 10:15" },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "einmalig",
    description: "Einmalig zum Ausprobieren",
    credits: 50,
    features: [
      "50 Credits einmalig",
      "Markenrecherche",
      "KI-Analyse",
      "1 Markenfall",
    ],
    limitations: [
      "Keine Verlängerung",
      "Keine Credit-Nachkäufe",
      "Kein PDF-Export",
    ],
    cta: "Aktueller Plan",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "20",
    period: "/Monat",
    description: "Für professionelle Nutzer",
    credits: 700,
    features: [
      "700 Credits/Monat",
      "Unbegrenzte Markenfälle",
      "KI-Analyse + Logo-Generierung",
      "PDF-Reports",
      "Credit-Nachkäufe möglich",
      "Prioritäts-Support",
    ],
    limitations: [],
    cta: "Upgrade auf Pro",
    popular: true,
  },
];

const CREDIT_PACKAGES = [
  { id: "small", credits: 100, price: 5, perCredit: "0,05", popular: false },
  { id: "medium", credits: 300, price: 12, perCredit: "0,04", popular: true, savings: "20%" },
  { id: "large", credits: 700, price: 25, perCredit: "0,036", popular: false, savings: "28%" },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  
  // Demo-Daten (später aus DB laden)
  const [currentPlan] = useState<"free" | "pro">("free");
  const [planCredits] = useState(33);
  const [planCreditsMax] = useState(50);
  const [bonusCredits] = useState(0);
  const [nextReset] = useState("01. Februar 2026");
  const [daysUntilReset] = useState(18);

  const totalCredits = planCredits + bonusCredits;
  const planUsedPercent = ((planCreditsMax - planCredits) / planCreditsMax) * 100;
  const isLowCredits = planCredits < planCreditsMax * 0.2;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guthaben & Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">
          Nächste Verlängerung in {daysUntilReset} Tagen am {nextReset}
        </p>
      </div>

      {/* Credit Status Cards - Windsurf Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Plan Credits</h2>
          <span className="text-sm text-gray-500">
            {currentPlan === "pro" ? "Pro Plan" : "Free Plan"}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">
              {planCredits} / {planCreditsMax} Credits
            </span>
            <span className={`${isLowCredits ? "text-red-500 font-medium" : "text-gray-500"}`}>
              {planCredits} übrig
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                isLowCredits ? "bg-red-500" : "bg-primary"
              }`}
              style={{ width: `${(planCredits / planCreditsMax) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {planCreditsMax - planCredits} Credits diesen Monat verbraucht · Erneuert am {nextReset}
        </p>

        {/* Low Credits Warning */}
        {isLowCredits && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Nur noch {planCredits} Credits!</strong> Das reicht für ~{Math.floor(planCredits / 5)} Markenrecherchen.
            </p>
          </div>
        )}
      </div>

      {/* Bonus Credits (nur für Pro oder wenn vorhanden) */}
      {(currentPlan === "pro" || bonusCredits > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Bonus Credits</h2>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              Verfallen nicht
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{bonusCredits}</p>
              <p className="text-xs text-gray-400 mt-1">Gekaufte Credits bleiben erhalten</p>
            </div>
            {currentPlan === "pro" && (
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Credits kaufen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-xl border-2 p-6 transition-all ${
              plan.popular
                ? "border-primary shadow-lg"
                : "border-gray-200 hover:border-gray-300"
            } ${currentPlan === plan.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Empfohlen
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-gray-600 text-sm">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plan.price}€</span>
              <span className="text-gray-600">{plan.period}</span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                <CreditCard className="w-4 h-4" />
                {plan.credits} Credits
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">—</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={currentPlan === plan.id}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                currentPlan === plan.id
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : plan.popular
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {currentPlan === plan.id ? (
                <>
                  <Check className="w-4 h-4" />
                  Aktueller Plan
                </>
              ) : (
                <>
                  {plan.cta}
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Credit Packages (nur für Pro) */}
      {currentPlan === "pro" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Credits nachkaufen</h2>
          <p className="text-gray-600 text-sm mb-6">
            Benötigen Sie mehr Credits? Kaufen Sie zusätzliche Pakete.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{pkg.credits}</p>
                  <p className="text-sm text-gray-500 mb-3">Credits</p>
                  <p className="text-xl font-bold text-primary mb-1">{pkg.price}€</p>
                  <p className="text-xs text-gray-400">{pkg.perCredit}€ pro Credit</p>
                </div>
                <button className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                  Kaufen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info für Free User */}
      {currentPlan === "free" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Mehr Credits benötigt?
          </h3>
          <p className="text-blue-800 text-sm">
            Upgraden Sie auf Pro, um monatlich 700 Credits zu erhalten und 
            jederzeit zusätzliche Credits nachkaufen zu können.
          </p>
        </div>
      )}

      {/* Letzte Aktivitäten */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4" />
            Letzte Aktivitäten
          </h3>
        </div>
        <div className="space-y-3">
          {DEMO_USAGE_HISTORY.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500">{item.target}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-red-500">{item.credits} Credits</p>
                <p className="text-xs text-gray-400">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit-Kosten Übersicht */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Credit-Kosten pro Aktion</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-gray-500 text-xs">Markensuche</p>
            <p className="font-bold text-gray-900">5</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-gray-500 text-xs">KI-Analyse</p>
            <p className="font-bold text-gray-900">5</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-gray-500 text-xs">Logo</p>
            <p className="font-bold text-gray-900">4</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-gray-500 text-xs">PDF-Report</p>
            <p className="font-bold text-gray-900">2</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-gray-500 text-xs">Chat</p>
            <p className="font-bold text-gray-900">1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
