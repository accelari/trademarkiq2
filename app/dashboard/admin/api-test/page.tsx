"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Zap, Search, MessageSquare, Image, Mic, Loader2, DollarSign, Hash, Send, Download } from "lucide-react";

type ApiType = "tmsearch" | "claude" | "falai" | "whisper";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  markup: number;
  finalCost: number;
  credits: number;
}

interface TestResult {
  success: boolean;
  apiType: ApiType;
  request?: {
    endpoint: string;
    method: string;
    payload: Record<string, unknown>;
  };
  response: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
  usage: TokenUsage;
  costs: CostBreakdown;
  duration: number;
}

const API_CONFIGS = {
  tmsearch: {
    name: "TMSearch",
    icon: Search,
    color: "bg-blue-500",
    description: "Markenrecherche API",
    costPerRequest: 0.05,
    placeholder: "Markenname eingeben...",
  },
  claude: {
    name: "Claude Opus 4",
    icon: MessageSquare,
    color: "bg-purple-500",
    description: "KI-Analyse (Token-basiert)",
    inputPricePer1M: 5.0,
    outputPricePer1M: 25.0,
    placeholder: "Prompt eingeben...",
  },
  falai: {
    name: "fal.ai Ideogram",
    icon: Image,
    color: "bg-pink-500",
    description: "Logo-Generierung",
    costPerRequest: 0.04,
    placeholder: "Logo-Beschreibung...",
  },
  whisper: {
    name: "OpenAI Whisper",
    icon: Mic,
    color: "bg-green-500",
    description: "Sprache-zu-Text",
    costPerMinute: 0.006,
    placeholder: "Audio-Datei testen...",
  },
};

const MARKUP_FACTOR = 3;
const CREDIT_VALUE = 0.03; // 1 Credit = 0,03€

export default function ApiTestPage() {
  const { data: session } = useSession();
  const [selectedApi, setSelectedApi] = useState<ApiType>("claude");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);

    const startTime = Date.now();

    try {
      const response = await fetch("/api/admin/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiType: selectedApi, input: input.trim() }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      setResult({
        ...data,
        duration,
      });
    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const config = API_CONFIGS[selectedApi];

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Admin: API Token Test
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Teste alle KI-APIs und sieh den Token-Verbrauch + Credit-Berechnung
        </p>
      </div>

      {/* API Auswahl */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(Object.entries(API_CONFIGS) as [ApiType, typeof config][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedApi(key)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedApi === key
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className={`w-10 h-10 ${cfg.color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-medium text-gray-900 text-sm">{cfg.name}</p>
              <p className="text-xs text-gray-500">{cfg.description}</p>
            </button>
          );
        })}
      </div>

      {/* Eingabe */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test-Eingabe für {config.name}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={config.placeholder}
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <button
          onClick={runTest}
          disabled={loading || !input.trim()}
          className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Test läuft...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Test ausführen
            </>
          )}
        </button>
      </div>

      {/* Ergebnis */}
      {result && (
        <div className="space-y-6">
          {/* Token-Verbrauch */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Token-Verbrauch
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.usage.inputTokens.toLocaleString()}</p>
                <p className="text-sm text-blue-600">Input Tokens</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">{result.usage.outputTokens.toLocaleString()}</p>
                <p className="text-sm text-purple-600">Output Tokens</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{result.usage.totalTokens.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Gesamt Tokens</p>
              </div>
            </div>
          </div>

          {/* Kosten-Berechnung */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Kosten-Berechnung
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Input Kosten ({result.usage.inputTokens} × $5/1M)</span>
                <span className="font-medium">{result.costs.inputCost.toFixed(4)}€</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Output Kosten ({result.usage.outputTokens} × $25/1M)</span>
                <span className="font-medium">{result.costs.outputCost.toFixed(4)}€</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">API-Kosten Gesamt</span>
                <span className="font-medium">{result.costs.totalCost.toFixed(4)}€</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">× {MARKUP_FACTOR} Markup</span>
                <span className="font-medium">{result.costs.finalCost.toFixed(4)}€</span>
              </div>
              <div className="flex justify-between py-3 bg-primary/10 rounded-lg px-3">
                <span className="font-semibold text-gray-900">= Credits</span>
                <span className="text-xl font-bold text-primary">{result.costs.credits} Credits</span>
              </div>
            </div>
          </div>

          {/* Was gesendet wurde (Request) */}
          {result.request && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-500" />
                Was gesendet wurde (Request)
              </h3>
              <div className="mb-3 text-sm">
                <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded font-mono text-xs mr-2">
                  {result.request.method}
                </span>
                <span className="text-gray-600 font-mono text-xs">{result.request.endpoint}</span>
              </div>
              <pre className="bg-orange-50 rounded-lg p-4 overflow-x-auto text-xs max-h-64 overflow-y-auto">
                {JSON.stringify(result.request.payload, null, 2)}
              </pre>
            </div>
          )}

          {/* Was empfangen wurde (Response) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-green-500" />
              Was empfangen wurde (Response)
            </h3>
            <div className="flex justify-between text-sm text-gray-500 mb-3">
              <span>Antwortzeit: {result.duration}ms</span>
              <span className={result.success ? "text-green-600" : "text-red-600"}>
                {result.success ? "✓ Erfolgreich" : "✗ Fehler"}
              </span>
            </div>
            <pre className="bg-green-50 rounded-lg p-4 overflow-x-auto text-xs max-h-64 overflow-y-auto">
              {JSON.stringify(result.response, null, 2)}
            </pre>
          </div>

          {/* Komplette rohe API-Antwort */}
          {result.rawResponse && (
            <details className="bg-white rounded-xl border border-gray-200 p-6">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2">
                📦 Komplette API-Antwort (Raw)
              </summary>
              <pre className="mt-4 bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs max-h-96 overflow-y-auto">
                {JSON.stringify(result.rawResponse, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-medium text-yellow-800 mb-2">💡 So funktioniert die Berechnung:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>Claude Opus 4:</strong> Input $5/1M Tokens, Output $25/1M Tokens</li>
          <li>• <strong>TMSearch:</strong> Pauschal 0,05€ pro Suche</li>
          <li>• <strong>fal.ai:</strong> Pauschal 0,04€ pro Bild</li>
          <li>• <strong>Markup:</strong> ×3 auf alle API-Kosten</li>
          <li>• <strong>1 Credit:</strong> = 0,03€ Verkaufswert</li>
        </ul>
      </div>
    </div>
  );
}
