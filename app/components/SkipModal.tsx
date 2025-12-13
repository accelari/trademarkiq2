"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface SkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: (reason: string) => void;
  stepName: string;
}

const skipReasons = [
  "Ich kenne mich bereits aus",
  "Ich habe bereits einen Anwalt",
  "Nur schnelle Recherche",
  "Sonstiges",
];

export default function SkipModal({ isOpen, onClose, onSkip, stepName }: SkipModalProps) {
  const [selectedReason, setSelectedReason] = useState("");

  if (!isOpen) return null;

  const handleSkip = () => {
    if (selectedReason) {
      onSkip(selectedReason);
      setSelectedReason("");
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Schritt überspringen?</h3>
          </div>

          <p className="text-gray-600 mb-6">
            Wir empfehlen, zuerst die <span className="font-medium text-gray-900">{stepName}</span> durchzuführen.
          </p>

          <div className="mb-6">
            <label className="s-label">Grund für das Überspringen</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="s-input"
            >
              <option value="">Bitte auswählen...</option>
              {skipReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Zurück
            </button>
            <button
              onClick={handleSkip}
              disabled={!selectedReason}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Überspringen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
