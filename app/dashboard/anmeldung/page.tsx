"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApplications, useExperts } from "@/lib/hooks";
import WorkflowProgress from "@/app/components/WorkflowProgress";
import {
  FileText,
  Image,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Euro,
  Clock,
  Globe,
  Info,
  AlertCircle,
  Loader2,
  X,
  CheckCircle,
  Handshake,
  Send,
  Star,
  MapPin,
  AlertTriangle
} from "lucide-react";

const NICE_CLASSES = [
  { id: 1, name: "Chemische Erzeugnisse", description: "Chemische Erzeugnisse für gewerbliche, wissenschaftliche Zwecke" },
  { id: 2, name: "Farben, Lacke", description: "Farben, Firnisse, Lacke; Rostschutzmittel" },
  { id: 3, name: "Kosmetika, Reinigungsmittel", description: "Wasch- und Bleichmittel; Putz-, Polier-, Fettentfernungs- und Schleifmittel" },
  { id: 4, name: "Industrieöle, Brennstoffe", description: "Technische Öle und Fette; Schmiermittel" },
  { id: 5, name: "Pharmazeutische Erzeugnisse", description: "Pharmazeutische und veterinärmedizinische Erzeugnisse" },
  { id: 6, name: "Metalle, Metallwaren", description: "Unedle Metalle und deren Legierungen" },
  { id: 7, name: "Maschinen", description: "Maschinen und Werkzeugmaschinen; Motoren" },
  { id: 8, name: "Handwerkzeuge", description: "Handbetätigte Werkzeuge und Geräte; Messer, Gabeln, Löffel" },
  { id: 9, name: "Elektrische Apparate, Computer", description: "Wissenschaftliche Apparate; Computer, Software", popular: true },
  { id: 10, name: "Medizinische Geräte", description: "Chirurgische, ärztliche, zahn- und tierärztliche Instrumente" },
  { id: 11, name: "Beleuchtung, Heizung", description: "Beleuchtungs-, Heizungs-, Dampferzeugungs- Geräte" },
  { id: 12, name: "Fahrzeuge", description: "Fahrzeuge; Apparate zur Beförderung auf dem Lande, in der Luft oder auf dem Wasser" },
  { id: 13, name: "Schusswaffen", description: "Schusswaffen; Munition und Geschosse; Sprengstoffe; Feuerwerkskörper" },
  { id: 14, name: "Edelmetalle, Schmuck", description: "Edelmetalle und deren Legierungen; Juwelierwaren, Schmuckwaren, Edelsteine" },
  { id: 15, name: "Musikinstrumente", description: "Musikinstrumente" },
  { id: 16, name: "Papier, Druckereierzeugnisse", description: "Papier und Pappe; Druckereierzeugnisse; Buchbinderartikel" },
  { id: 17, name: "Kautschuk, Kunststoffe", description: "Kautschuk, Guttapercha, Gummi, Asbest, Glimmer" },
  { id: 18, name: "Leder, Lederwaren", description: "Leder und Lederimitationen; Häute und Felle; Reise- und Handkoffer" },
  { id: 19, name: "Baumaterialien", description: "Baumaterialien (nicht aus Metall)" },
  { id: 20, name: "Möbel", description: "Möbel, Spiegel, Rahmen" },
  { id: 21, name: "Haushaltsgeräte", description: "Geräte und Behälter für Haushalt und Küche" },
  { id: 22, name: "Seile, Zelte", description: "Seile, Bindfaden, Netze, Zelte, Planen, Segel" },
  { id: 23, name: "Garne, Fäden", description: "Garne und Fäden für textile Zwecke" },
  { id: 24, name: "Textilwaren", description: "Webstoffe und Textilwaren; Bett- und Tischdecken" },
  { id: 25, name: "Bekleidung, Schuhe", description: "Bekleidungsstücke, Schuhwaren, Kopfbedeckungen" },
  { id: 26, name: "Kurzwaren", description: "Spitzen und Stickereien, Bänder und Schnürbänder" },
  { id: 27, name: "Teppiche, Bodenbeläge", description: "Teppiche, Fußmatten, Matten, Linoleum" },
  { id: 28, name: "Spiele, Spielzeug", description: "Spiele, Spielzeug; Turn- und Sportartikel" },
  { id: 29, name: "Fleisch, Fisch, Milchprodukte", description: "Fleisch, Fisch, Geflügel; Milch und Milchprodukte" },
  { id: 30, name: "Kaffee, Backwaren", description: "Kaffee, Tee, Kakao; Reis; Zucker; Brot, feine Backwaren" },
  { id: 31, name: "Landwirtschaftliche Erzeugnisse", description: "Land-, garten- und forstwirtschaftliche Erzeugnisse" },
  { id: 32, name: "Bier, alkoholfreie Getränke", description: "Biere; Mineralwässer und kohlensäurehaltige Wässer" },
  { id: 33, name: "Alkoholische Getränke", description: "Alkoholische Getränke (ausgenommen Biere)" },
  { id: 34, name: "Tabak, Raucherartikel", description: "Tabak; Raucherartikel; Streichhölzer" },
  { id: 35, name: "Werbung, Geschäftsführung", description: "Werbung; Geschäftsführung; Unternehmensverwaltung", popular: true },
  { id: 36, name: "Versicherungen, Finanzwesen", description: "Versicherungswesen; Finanzwesen; Geldgeschäfte; Immobilienwesen" },
  { id: 37, name: "Bauwesen, Reparatur", description: "Bauwesen; Reparaturwesen; Installationsarbeiten" },
  { id: 38, name: "Telekommunikation", description: "Telekommunikation" },
  { id: 39, name: "Transport, Reiseveranstaltung", description: "Transportwesen; Verpackung und Lagerung von Waren" },
  { id: 40, name: "Materialbearbeitung", description: "Materialbearbeitung" },
  { id: 41, name: "Erziehung, Unterhaltung", description: "Erziehung; Ausbildung; Unterhaltung; sportliche und kulturelle Aktivitäten" },
  { id: 42, name: "IT-Dienstleistungen", description: "Wissenschaftliche und technologische Dienstleistungen; Entwurf und Entwicklung von Computerhardware und -software", popular: true },
  { id: 43, name: "Verpflegung, Beherbergung", description: "Dienstleistungen zur Verpflegung und Beherbergung von Gästen" },
  { id: 44, name: "Medizinische Dienstleistungen", description: "Medizinische und veterinärmedizinische Dienstleistungen; Gesundheits- und Schönheitspflege" },
  { id: 45, name: "Juristische Dienstleistungen", description: "Juristische Dienstleistungen; Sicherheitsdienste" },
];

const JURISDICTIONS = [
  {
    id: "dpma",
    name: "DPMA",
    fullName: "Deutsches Patent- und Markenamt",
    flag: "🇩🇪",
    cost: 290,
    costDisplay: "290€",
    costPerClass: 100,
    duration: "3-6 Monate",
    territory: "Deutschland",
    pros: ["Schnelle Bearbeitung", "Günstigste Option", "Deutsche Sprache"],
    cons: ["Nur nationaler Schutz", "Begrenzte Reichweite"],
  },
  {
    id: "euipo",
    name: "EUIPO",
    fullName: "Amt der Europäischen Union für geistiges Eigentum",
    flag: "🇪🇺",
    cost: 850,
    costDisplay: "850€",
    costPerClass: 50,
    duration: "4-6 Monate",
    territory: "27 EU-Länder",
    pros: ["EU-weiter Schutz", "Einheitliches Verfahren", "Starker Schutz"],
    cons: ["Höhere Kosten", "Längere Prüfung"],
  },
  {
    id: "wipo",
    name: "WIPO",
    fullName: "Weltorganisation für geistiges Eigentum",
    flag: "🌍",
    cost: 653,
    costDisplay: "ab 653 CHF",
    costPerClass: 100,
    duration: "12-18 Monate",
    territory: "130+ Länder wählbar",
    pros: ["Weltweiter Schutz möglich", "Flexible Länderauswahl", "Zentrale Verwaltung"],
    cons: ["Komplexes Verfahren", "Variable Kosten je nach Land"],
  },
];

const MARK_TYPES = [
  { id: "wortmarke", name: "Wortmarke", icon: FileText, description: "Schutz für reine Textmarken ohne grafische Gestaltung" },
  { id: "bildmarke", name: "Bildmarke", icon: Image, description: "Schutz für Logos und grafische Elemente ohne Text" },
  { id: "wort-bild-marke", name: "Wort-Bild-Marke", icon: Layers, description: "Kombination aus Text und grafischen Elementen" },
];

export default function AnmeldungPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applications, mutate } = useApplications();
  const { experts } = useExperts();

  const urlSearchId = searchParams.get("searchId");
  const urlMarkName = searchParams.get("markName");

  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(urlSearchId);
  const [saving, setSaving] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    markName: urlMarkName || "",
    markType: "",
    description: "",
    jurisdiction: "",
    niceClasses: [] as number[],
    goodsServices: "",
  });

  const [classSearch, setClassSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (urlMarkName && !formData.markName) {
      setFormData(prev => ({ ...prev, markName: urlMarkName }));
    }
    if (urlSearchId) {
      setSearchId(urlSearchId);
    }
  }, [urlMarkName, urlSearchId]);

  const filteredClasses = NICE_CLASSES.filter(
    (c) =>
      c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.id.toString().includes(classSearch)
  );

  const calculateEstimatedCost = () => {
    const jurisdiction = JURISDICTIONS.find((j) => j.id === formData.jurisdiction);
    if (!jurisdiction) return 0;

    let cost = jurisdiction.cost;
    const classCount = formData.niceClasses.length;

    if (formData.jurisdiction === "dpma" && classCount > 3) {
      cost += (classCount - 3) * jurisdiction.costPerClass;
    } else if (formData.jurisdiction === "euipo" && classCount > 1) {
      if (classCount === 2) cost += 50;
      else if (classCount > 2) cost += 50 + (classCount - 2) * 150;
    }

    return cost;
  };

  const saveProgress = async (data: Partial<typeof formData>, step?: number) => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        ...data,
        currentStep: step || currentStep,
        estimatedCost: calculateEstimatedCost(),
        searchId: searchId || undefined,
      };

      if (applicationId) {
        await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (payload.markName) {
          const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const newApp = await res.json();
            setApplicationId(newApp.id);
          }
        }
      }
      mutate();
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
  };

  const nextStep = async () => {
    await saveProgress(formData, currentStep + 1);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.markName.trim() !== "" && formData.markType !== "";
      case 2:
        return formData.jurisdiction !== "";
      case 3:
        return formData.niceClasses.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const toggleClass = (classId: number) => {
    const newClasses = formData.niceClasses.includes(classId)
      ? formData.niceClasses.filter((c) => c !== classId)
      : [...formData.niceClasses, classId];
    updateFormData({ niceClasses: newClasses });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (applicationId) {
        await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: selectedExpert ? "expert_review" : "submitted",
            expertId: selectedExpert?.id || null,
            estimatedCost: calculateEstimatedCost(),
            searchId: searchId || null,
          }),
        });
      }

      const jurisdiction = JURISDICTIONS.find((j) => j.id === formData.jurisdiction);
      const estimatedExpiryDate = new Date();
      estimatedExpiryDate.setFullYear(estimatedExpiryDate.getFullYear() + 10);
      
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.markName,
          jurisdiction: formData.jurisdiction || "dpma",
          classes: formData.niceClasses.map(String),
          expiryDate: estimatedExpiryDate.toISOString(),
          status: "pending",
        }),
      });

      mutate();
      router.push("/dashboard/watchlist");
    } catch (error) {
      console.error("Error submitting application:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const assignExpert = async (expert: any) => {
    setSelectedExpert(expert);
    setShowExpertModal(false);
    if (applicationId) {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: expert.id, status: "expert_review" }),
      });
      mutate();
    }
  };

  const removeExpert = async () => {
    setSelectedExpert(null);
    if (applicationId) {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: null, status: "draft" }),
      });
      mutate();
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = [
    { id: 1, name: "Markeninfo" },
    { id: 2, name: "Amt" },
    { id: 3, name: "Nizza-Klassen" },
    { id: 4, name: "Zusammenfassung" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <WorkflowProgress currentStep={4} searchName={formData.markName || undefined} />

      {!searchId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Empfehlung</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Führen Sie zuerst eine{" "}
              <a href="/dashboard/recherche" className="underline hover:no-underline">
                Markenrecherche
              </a>{" "}
              und{" "}
              <a href="/dashboard/risiko" className="underline hover:no-underline">
                Risikoanalyse
              </a>{" "}
              durch, um mögliche Konflikte zu identifizieren.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Neue Markenanmeldung</h1>
          <p className="text-gray-600 mt-1">Schritt {currentStep} von 4</p>
        </div>
        {saving && (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Speichern...
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? "bg-primary text-white"
                      : currentStep === step.id
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Markentyp auswählen</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {MARK_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => updateFormData({ markType: type.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.markType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`w-8 h-8 mb-3 ${
                          formData.markType === type.id ? "text-primary" : "text-gray-400"
                        }`}
                      />
                      <h3 className="font-medium text-gray-900">{type.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.markName}
                onChange={(e) => updateFormData({ markName: e.target.value })}
                placeholder="z.B. TrademarkIQ"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Beschreiben Sie Ihre Marke, z.B. Farben, Schriftart, besondere Merkmale..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Markenamt auswählen</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {JURISDICTIONS.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => updateFormData({ jurisdiction: j.id })}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      formData.jurisdiction === j.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-3xl mb-3">{j.flag}</div>
                    <h3 className="font-semibold text-gray-900">{j.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{j.fullName}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-primary">{j.costDisplay}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{j.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span>{j.territory}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {formData.jurisdiction && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-medium text-gray-900 mb-4">Vergleich</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Vorteile
                    </h4>
                    <ul className="space-y-1">
                      {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.pros.map(
                        (pro, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">+</span>
                            {pro}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                      <Info className="w-4 h-4" /> Nachteile
                    </h4>
                    <ul className="space-y-1">
                      {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.cons.map(
                        (con, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">-</span>
                            {con}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Nizza-Klassen auswählen</h2>
                  <p className="text-sm text-gray-500">
                    {formData.niceClasses.length} Klasse(n) ausgewählt
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder="Klassen durchsuchen..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary w-64"
                  />
                </div>
              </div>

              {formData.jurisdiction === "dpma" && formData.niceClasses.length > 3 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Zusatzkosten beachten</p>
                    <p className="text-amber-700">
                      Bei DPMA sind 3 Klassen in der Grundgebühr enthalten. Jede weitere Klasse
                      kostet 100€ zusätzlich. Aktuell: +{(formData.niceClasses.length - 3) * 100}€
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {filteredClasses.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.niceClasses.includes(cls.id)
                        ? "border-primary bg-primary/5"
                        : cls.popular
                        ? "border-amber-200 bg-amber-50 hover:border-amber-300"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          formData.niceClasses.includes(cls.id) ? "text-primary" : "text-gray-700"
                        }`}
                      >
                        Klasse {cls.id}
                      </span>
                      {cls.popular && !formData.niceClasses.includes(cls.id) && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                          Beliebt
                        </span>
                      )}
                      {formData.niceClasses.includes(cls.id) && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{cls.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waren- und Dienstleistungsverzeichnis (optional)
              </label>
              <textarea
                value={formData.goodsServices}
                onChange={(e) => updateFormData({ goodsServices: e.target.value })}
                placeholder="Beschreiben Sie detailliert die Waren und Dienstleistungen, die unter Ihrer Marke angeboten werden sollen..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Zusammenfassung</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Markeninformationen</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="font-medium text-gray-900">{formData.markName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Typ:</dt>
                      <dd className="font-medium text-gray-900">
                        {MARK_TYPES.find((t) => t.id === formData.markType)?.name}
                      </dd>
                    </div>
                    {formData.description && (
                      <div>
                        <dt className="text-gray-600 mb-1">Beschreibung:</dt>
                        <dd className="text-sm text-gray-900">{formData.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Markenamt</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.flag}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.territory}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Nizza-Klassen ({formData.niceClasses.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.niceClasses.sort((a, b) => a - b).map((cls) => (
                      <span
                        key={cls}
                        className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-md font-medium"
                      >
                        Klasse {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Geschätzte Kosten</h3>
                  <p className="text-3xl font-bold text-primary">{calculateEstimatedCost()}€</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Basierend auf {formData.niceClasses.length} Klasse(n) bei{" "}
                    {JURISDICTIONS.find((j) => j.id === formData.jurisdiction)?.name}
                  </p>
                </div>

                {selectedExpert ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        {selectedExpert.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{selectedExpert.name}</p>
                        <p className="text-sm text-gray-500">{selectedExpert.company}</p>
                      </div>
                      <button
                        onClick={removeExpert}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-green-700 mt-3 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Experte wird Ihre Anmeldung begleiten
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowExpertModal(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <Handshake className="w-8 h-8 text-gray-400 group-hover:text-primary mx-auto mb-2" />
                    <p className="font-medium text-gray-700 group-hover:text-primary">
                      Experten hinzuziehen
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Lassen Sie einen Markenanwalt Ihre Anmeldung prüfen
                    </p>
                  </button>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {submitting ? "Wird gesendet..." : "Anmeldung starten"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        {currentStep < 4 && (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {showExpertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Experte auswählen</h3>
              <button
                onClick={() => setShowExpertModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
              {experts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Experten verfügbar.</p>
              ) : (
                experts.map((expert: any) => (
                  <button
                    key={expert.id}
                    onClick={() => assignExpert(expert)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        {expert.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{expert.name}</p>
                          {expert.verified && <CheckCircle className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-sm text-gray-500">
                          {expert.title} • {expert.company}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {(expert.rating / 10).toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {expert.location}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium text-gray-900">{expert.price}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
