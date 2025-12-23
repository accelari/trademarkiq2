"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, MessageCircle, Mic, ExternalLink } from "lucide-react";

interface BeratungModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  onStartBeratung: () => void;
}

export function BeratungModal({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  onStartBeratung,
}: BeratungModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-teal-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">KI-Markenberater</h2>
                <p className="text-sm text-teal-100">{caseNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Beratung starten
            </h3>
            <p className="text-gray-600">
              Unser KI-Berater hilft Ihnen, die wichtigsten Informationen für Ihre Markenanmeldung zu ermitteln:
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold text-sm">
                1
              </div>
              <span className="text-gray-700">Markenname festlegen</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold text-sm">
                2
              </div>
              <span className="text-gray-700">Zielländer auswählen</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold text-sm">
                3
              </div>
              <span className="text-gray-700">Nizza-Klassen bestimmen</span>
            </div>
          </div>

          <button
            onClick={onStartBeratung}
            className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Beratung öffnen
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Sie werden zum KI-Markenberater weitergeleitet
          </p>
        </div>
      </div>
    </div>
  );
}
