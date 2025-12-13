"use client";

import { VoiceProvider } from "@humeai/voice-react";
import VoiceAssistant from "../VoiceAssistant";

interface VoiceAssistantSectionProps {
  accessToken: string;
  hasVoiceAssistant: boolean;
}

export default function VoiceAssistantSection({ 
  accessToken, 
  hasVoiceAssistant 
}: VoiceAssistantSectionProps) {
  return (
    <section className="s-section bg-gray-300" id="markenberater">
      <div className="s-container">
        <div className="text-center mb-10">
          <span className="s-badge mb-4">KI-Markenberater</span>
          <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
            Sprechen Sie mit unserem Markenexperten
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unser KI-Assistent beantwortet Ihre Fragen rund um Markenrecherche, 
            Markenprüfung und Markenverlängerung – in Echtzeit per Sprache.
          </p>
        </div>

        {hasVoiceAssistant ? (
          <VoiceProvider enableAudioWorklet={false}>
            <VoiceAssistant accessToken={accessToken} />
          </VoiceProvider>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-sm p-8 text-center">
            <p className="text-gray-600">
              Der Sprachassistent ist derzeit nicht verfügbar. 
              Bitte versuchen Sie es später erneut.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
