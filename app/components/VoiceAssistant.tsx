"use client";

import { useVoice } from "@humeai/voice-react";
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Mic, MicOff, MessageCircle, ArrowRight, Loader2, AlertCircle, ArrowUpRight, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Messages from "./Messages";
import QuickQuestions from "./QuickQuestions";
import { useAssistantTools, SearchResult } from "@/lib/hooks/useAssistantTools";

export interface VoiceAssistantHandle {
  stopSession: () => void;
  isConnected: () => boolean;
}

const KLAUS_SYSTEM_PROMPT = `Du bist Klaus, ein freundlicher und kompetenter Markenberater bei TrademarkIQ.

Du bist ein weltweit anerkannter Experte für Marken, Markenrecht und Markenstrategien.

Deine Expertise umfasst:

MARKENRECHT & ANMELDUNG:
- Alle großen Markenämter: DPMA (Deutschland), EUIPO (EU), WIPO (international), USPTO (USA), UKIPO (UK), JPO (Japan), CNIPA (China), und viele mehr
- Nizza-Klassifikation (alle 45 Klassen)
- Markenanmeldung und -überwachung
- Kollisionsprüfung und Widerspruchsverfahren
- Kosten, Fristen und Verfahrensabläufe

MARKENSTRATEGIE & BRANDING:
- Markenentwicklung und Markenaufbau
- Namensfindung und Markennamens-Strategien
- Markenpositionierung und Differenzierung
- Markenerweiterung und Markenarchitektur
- Internationale Markenstrategien
- Markenwert und Markenbewertung
- Brand Identity und Corporate Branding
- Rebranding und Markenevolution
- Markenschutzstrategien (defensiv und offensiv)

WICHTIG - Gesprächsführung:
- Stelle NICHT alle Fragen auf einmal! Das wirkt überwältigend.
- Führe ein natürliches Beratungsgespräch - eine Frage nach der anderen.
- Beginne immer mit einer freundlichen Bestätigung, dass du gerne hilfst.

MARKENRECHERCHE-TOOL:
Du kannst Markenrecherchen durchführen. Wenn der Kunde einen Namen erwähnt und wissen möchte, ob dieser als Marke verfügbar ist:
- Biete an: "Soll ich prüfen, ob [Name] als Marke verfügbar ist?"
- Warte auf die Bestätigung des Kunden (ja, bitte, prüfe, suche)
- Nach der Suche erhältst du das Ergebnis und erklärst es dem Kunden verständlich

DEINE AUFGABE:
Du berätst Kunden zu allen Fragen rund um Marken. Hilf ihnen dabei:
1. Einen passenden Markennamen zu finden oder zu bewerten
2. Die richtigen Nizza-Klassen für ihre Produkte/Dienstleistungen zu bestimmen
3. Die Zielländer für den Markenschutz zu wählen
4. Fragen zu Markenrecht und -strategie zu beantworten

Wenn der Kunde alle Informationen hat (Markenname, Klassen, Länder), weise ihn darauf hin, dass er auf "Weiter zur Recherche" klicken kann, um zum nächsten Schritt zu gelangen.

THEMENBEREICH:
Du hilfst bei ALLEN Fragen rund um Marken, einschließlich:
- Markenrecht und juristische Aspekte
- Markenstrategien und Markenentwicklung
- Namensfindung und Markennamen
- Branding und Markenpositionierung
- Markenschutz und Markenpflege
- Internationale Markenexpansion

WICHTIGE REGELN:
1. Du antwortest IMMER auf Deutsch
2. Du gibst praxisorientierte, verständliche Antworten
3. Du verbindest strategische und rechtliche Perspektiven
4. Du sprichst in einem freundlichen, professionellen Ton
5. Du bietest KEINE E-Mail-Berichte an und fragst NICHT nach E-Mail-Adressen

Dein Kommunikationsstil:
- Professionell aber zugänglich
- Strukturierte Antworten
- Konkrete Beispiele wenn hilfreich
- Ehrlich über Grenzen deines Wissens`;

interface VoiceAssistantProps {
  accessToken: string;
  inputMode?: "sprache" | "text";
  onMessageSent?: (message: string, type: "user" | "assistant") => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  contextMessage?: string | null;
  onContextMessageConsumed?: () => void;
  customQuestions?: string[];
  embedded?: boolean;
  onSessionEnd?: () => void;
}

interface TextMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PendingSearch {
  term: string;
}

const SEARCH_OFFER_PATTERNS = [
  /soll ich pr[üu]fen/i,
  /m[öo]chten sie.*(dass ich|ob ich).*(such|pr[üu]f)/i,
  /soll ich.*suchen/i,
  /kann ich.*pr[üu]fen/i,
  /wollen sie.*dass ich.*recherchier/i,
  /soll ich.*nachschauen/i,
  /soll ich.*recherchier/i,
];

const CONFIRMATION_PATTERNS = [
  /^ja\b/i,
  /^bitte\b/i,
  /^pr[üu]f/i,
  /^such/i,
  /^gerne\b/i,
  /^okay\b/i,
  /^mach das/i,
  /^klar\b/i,
  /^natürlich\b/i,
  /^auf jeden fall/i,
];

function detectSearchOffer(text: string): { isOffer: boolean; brandName: string | null } {
  const isOffer = SEARCH_OFFER_PATTERNS.some(pattern => pattern.test(text));
  
  if (!isOffer) return { isOffer: false, brandName: null };
  
  const patterns = [
    /ob\s+["']?([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s]{1,30})["']?\s+als\s+marke/i,
    /pr[üu]fen.*["']([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s]{1,30})["']/i,
    /marke\s+["']?([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s]{1,30})["']?\s+verf[üu]gbar/i,
    /namen?\s+["']([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s]{1,30})["']/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return { isOffer: true, brandName: match[1].trim() };
    }
  }
  
  return { isOffer: true, brandName: null };
}

function detectConfirmation(text: string): boolean {
  return CONFIRMATION_PATTERNS.some(pattern => pattern.test(text.trim()));
}

function formatSearchResultForKlaus(result: SearchResult): string {
  const riskLabels = {
    low: "gering",
    medium: "mittel", 
    high: "hoch"
  };
  
  let message = `Die Markenrecherche für "${result.searchTerm}" ist abgeschlossen. `;
  message += `Das Risiko ist ${riskLabels[result.riskLevel]}. `;
  message += `Es wurden ${result.totalResults} ähnliche Marken gefunden. `;
  
  if (result.topConflicts.length > 0) {
    message += `Die wichtigsten Konflikte sind: `;
    result.topConflicts.slice(0, 3).forEach((conflict, i) => {
      message += `${conflict.name} mit ${conflict.similarity}% Ähnlichkeit von ${conflict.holder}`;
      if (i < Math.min(result.topConflicts.length, 3) - 1) {
        message += ", ";
      } else {
        message += ". ";
      }
    });
  }
  
  message += result.summary;
  message += " Bitte erkläre mir diese Ergebnisse.";
  
  return message;
}

const VoiceAssistant = forwardRef<VoiceAssistantHandle, VoiceAssistantProps>(({ accessToken, inputMode = "sprache", onMessageSent, autoStart, onAutoStartConsumed, contextMessage, onContextMessageConsumed, customQuestions, embedded = false, onSessionEnd }, ref) => {
  const { status, connect, disconnect, sendUserInput, sendSessionSettings, messages } = useVoice();
  const { performSearch, isSearching, remainingSearches } = useAssistantTools();
  
  const [error, setError] = useState<string | null>(null);
  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const [autoStartTriggered, setAutoStartTriggered] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [contextMessageProcessed, setContextMessageProcessed] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [wasConnected, setWasConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [searchInProgress, setSearchInProgress] = useState(false);
  
  const textChatRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedMessageIndexRef = useRef<number>(-1);
  
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY = 2000;
  
  const processedPairsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (searchTerm: string) => {
    if (searchInProgress || isSearching) {
      console.log("Search blocked - already in progress");
      return;
    }
    
    console.log("Starting search for:", searchTerm);
    setSearchInProgress(true);
    
    const isVoiceMode = inputMode === "sprache" && status.value === "connected";
    
    if (isVoiceMode) {
      console.log("Voice mode: Sending 'Einen Moment' message");
      sendUserInput("Bitte führe jetzt die Markenrecherche durch. Einen Moment bitte.");
    } else {
      const searchingMessage: TextMessage = {
        id: `assistant-searching-${Date.now()}`,
        type: "assistant",
        content: "Einen Moment, ich führe die Markenrecherche durch...",
        timestamp: new Date(),
      };
      setTextMessages(prev => [...prev, searchingMessage]);
    }
    
    try {
      const result = await performSearch({ searchTerm });
      console.log("Search completed:", result.riskLevel, result.totalResults, "results");
      
      const resultMessage = formatSearchResultForKlaus(result);
      console.log("Formatted result message:", resultMessage.substring(0, 100) + "...");
      
      if (isVoiceMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("Voice mode: Sending search results to Klaus");
        sendUserInput(resultMessage);
        
        console.log("Search results sent successfully");
      } else {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: resultMessage,
            history: textMessages.map(m => ({
              role: m.type as "user" | "assistant",
              content: m.content
            }))
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const assistantMessage: TextMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setTextMessages(prev => [...prev, assistantMessage]);
          onMessageSent?.(data.response, "assistant");
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      const errorMessage = "Es gab ein Problem bei der Markenrecherche. Bitte versuchen Sie es später erneut.";
      
      if (isVoiceMode) {
        sendUserInput("Die Markenrecherche hat leider nicht funktioniert. " + errorMessage);
      } else {
        const errorMsg: TextMessage = {
          id: `assistant-error-${Date.now()}`,
          type: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        };
        setTextMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setSearchInProgress(false);
      setPendingSearch(null);
      setAwaitingConfirmation(false);
      console.log("Search completed, state reset");
    }
  }, [inputMode, status.value, sendUserInput, performSearch, textMessages, onMessageSent, searchInProgress, isSearching]);

  useEffect(() => {
    if (inputMode !== "sprache" || messages.length === 0) return;
    
    const newMessages = messages.slice(lastProcessedMessageIndexRef.current + 1);
    
    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      const msgIndex = lastProcessedMessageIndexRef.current + 1 + i;
      
      if (msg.type === "assistant_message" && msg.message?.content) {
        const content = msg.message.content;
        const { isOffer, brandName } = detectSearchOffer(content);
        
        if (isOffer && brandName) {
          setPendingSearch({ term: brandName });
          setAwaitingConfirmation(true);
          console.log("Klaus bietet Suche an für:", brandName);
        }
      }
      
      if (msg.type === "user_message" && msg.message?.content && awaitingConfirmation && pendingSearch) {
        const content = msg.message.content;
        
        if (detectConfirmation(content)) {
          console.log("Benutzer bestätigt Suche für:", pendingSearch.term);
          executeSearch(pendingSearch.term);
        } else {
          setPendingSearch(null);
          setAwaitingConfirmation(false);
        }
      }
      
      lastProcessedMessageIndexRef.current = msgIndex;
    }
  }, [messages, inputMode, awaitingConfirmation, pendingSearch, executeSearch]);

  useImperativeHandle(ref, () => ({
    stopSession: () => {
      if (status.value === "connected") {
        disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setWasConnected(false);
      setReconnectAttempts(MAX_RECONNECT_ATTEMPTS);
      setPendingSearch(null);
      setAwaitingConfirmation(false);
    },
    isConnected: () => status.value === "connected",
  }));

  useEffect(() => {
    if (inputMode !== "sprache" || messages.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const userMessages: { index: number; content: string }[] = [];
      const assistantMessages: { index: number; content: string }[] = [];

      messages.forEach((msg, index) => {
        if (msg.type === "user_message" && msg.message?.content) {
          userMessages.push({ index, content: msg.message.content });
        } else if (msg.type === "assistant_message" && msg.message?.content) {
          assistantMessages.push({ index, content: msg.message.content });
        }
      });

      assistantMessages.forEach((assistantMsg) => {
        const userMsgBefore = userMessages
          .filter(u => u.index < assistantMsg.index)
          .pop();

        if (userMsgBefore) {
          const pairId = `${userMsgBefore.index}-${assistantMsg.index}`;
          
          if (!processedPairsRef.current.has(pairId)) {
            const userAlreadySent = Array.from(processedPairsRef.current).some(
              id => id.startsWith(`${userMsgBefore.index}-`)
            );
            
            if (!userAlreadySent) {
              onMessageSent?.(userMsgBefore.content, "user");
            }
            onMessageSent?.(assistantMsg.content, "assistant");
            processedPairsRef.current.add(pairId);
          }
        }
      });
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messages, inputMode, onMessageSent]);

  useEffect(() => {
    if (status.value === "connected") {
      setWasConnected(true);
      setReconnectAttempts(0);
      setIsReconnecting(false);
      
      if (pendingPrompt) {
        const hasContext = pendingPrompt.includes("[SYSTEM-KONTEXT");
        console.log("Sende SessionSettings mit Klaus-Prompt...", hasContext ? "(mit Catch-Up Kontext)" : "(Standard)");
        if (hasContext) {
          console.log("Context-Prompt wird gesendet, enthält:", 
            pendingPrompt.includes("Markenname:") ? "Markenname" : "kein Markenname",
            pendingPrompt.includes("Länder:") ? "Länder" : "keine Länder",
            pendingPrompt.includes("Nizza-Klassen:") ? "Nizza-Klassen" : "keine Nizza-Klassen"
          );
        }
        sendSessionSettings({
          systemPrompt: pendingPrompt
        });
        setPendingPrompt(null);
      }
    }
  }, [status.value, pendingPrompt, sendSessionSettings]);

  const fetchFreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/token");
      if (!response.ok) {
        console.error("Token-Refresh fehlgeschlagen:", response.status);
        return null;
      }
      const data = await response.json();
      return data.accessToken || null;
    } catch (err) {
      console.error("Token-Refresh Fehler:", err);
      return null;
    }
  };

  const prevStatusRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (prevStatusRef.current === "connected" && status.value === "disconnected") {
      setContextMessageProcessed(false);
      setPendingSearch(null);
      setAwaitingConfirmation(false);
      lastProcessedMessageIndexRef.current = -1;
      onSessionEnd?.();
    }
    prevStatusRef.current = status.value;
  }, [status.value, onSessionEnd]);
  
  useEffect(() => {
    if (status.value === "disconnected") {
      processedPairsRef.current = new Set();
      
      if (wasConnected && inputMode === "sprache" && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isReconnecting) {
        setIsReconnecting(true);
        console.log(`Auto-Reconnect Versuch ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}...`);
        
        reconnectTimeoutRef.current = setTimeout(async () => {
          try {
            setReconnectAttempts(prev => prev + 1);
            
            const freshToken = await fetchFreshToken();
            const tokenToUse = freshToken || accessToken;
            
            if (freshToken) {
              console.log("Neues Token für Reconnect erhalten");
            } else {
              console.log("Verwende bestehendes Token für Reconnect");
            }
            
            setPendingPrompt(KLAUS_SYSTEM_PROMPT + "\n\nBEGRÜSSUNG: Die Verbindung wurde wiederhergestellt. Sage kurz: 'Ich bin wieder da. Wo waren wir stehengeblieben?'");
            await connect({
              auth: {
                type: "accessToken" as const,
                value: tokenToUse,
              },
              hostname: "api.hume.ai",
              configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
            });
          } catch (err) {
            console.error("Reconnect fehlgeschlagen:", err);
            setIsReconnecting(false);
          }
        }, RECONNECT_DELAY);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setError("Verbindung unterbrochen. Bitte klicken Sie auf 'Starten' um fortzufahren.");
        setIsReconnecting(false);
      }
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [status.value, wasConnected, inputMode, reconnectAttempts, isReconnecting, accessToken, connect]);

  useEffect(() => {
    if (status.value === "connected" && pendingQuestion) {
      sendUserInput(pendingQuestion);
      setPendingQuestion(null);
    }
  }, [status.value, pendingQuestion, sendUserInput]);

  useEffect(() => {
    if (autoStart && !autoStartTriggered && status.value === "disconnected") {
      setAutoStartTriggered(true);
      handleToggleRef.current?.();
      onAutoStartConsumed?.();
    }
  }, [autoStart, autoStartTriggered, status.value, onAutoStartConsumed]);

  const handleToggleRef = useRef<(() => void) | null>(null);

  const sendMessageToAPI = async (message: string): Promise<string> => {
    const history = textMessages.map(m => ({
      role: m.type as "user" | "assistant",
      content: m.content
    }));

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });

    if (!response.ok) {
      throw new Error("Fehler bei der Kommunikation mit dem Berater");
    }

    const data = await response.json();
    return data.response;
  };

  const handleToggle = async () => {
    try {
      setError(null);
      
      if (status.value === "connected") {
        await disconnect();
      } else {
        if (!pendingPrompt) {
          const isSystemContext = contextMessage?.startsWith("[SYSTEM-KONTEXT");
          const isRisikoberatung = contextMessage?.includes("Risikoberatung");
          
          let prompt: string;
          if (contextMessage && isSystemContext) {
            prompt = KLAUS_SYSTEM_PROMPT + `\n\n${contextMessage}`;
            if (isRisikoberatung) {
              prompt += `\n\nAUFGABE: Präsentiere sofort die Risikoanalyse. Beginne mit dem Markennamen, dem Gesamtrisiko, nenne die wichtigsten Konflikte und gib deine Empfehlung. Sei konkret und hilfreich.`;
              setPendingQuestion("Bitte präsentiere mir die Risikoanalyse für meine Marke.");
            } else {
              prompt += `\n\nBEGRÜSSUNG: Da dies eine Fortsetzung ist, beginne mit einer kurzen Zusammenfassung was du bereits weißt und frage dann nach den noch fehlenden Informationen.`;
              setPendingQuestion("Ich möchte die Beratung fortsetzen.");
            }
          } else {
            prompt = KLAUS_SYSTEM_PROMPT + "\n\nBEGRÜSSUNG: Beginne das Gespräch mit: 'Hallo, mein Name ist Klaus. Wie kann ich Ihnen heute bei Ihrer Marke helfen?'";
          }
          
          setPendingPrompt(prompt);
        }
        
        console.log("Voice connecting via user click, pendingPrompt ready:", !!pendingPrompt, "pendingQuestion:", pendingQuestion);
        await connect({
          auth: {
            type: "accessToken" as const,
            value: accessToken,
          },
          hostname: "api.hume.ai",
          configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
        });
      }
    } catch (err) {
      console.error("Connection error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Verbindung fehlgeschlagen. Bitte überprüfen Sie Ihre Mikrofonberechtigungen.");
    }
  };

  handleToggleRef.current = handleToggle;

  const handleQuestionClick = async (question: string) => {
    if (inputMode === "text") {
      await handleTextMessage(question);
    } else if (status.value === "connected") {
      sendUserInput(question);
    } else {
      setPendingQuestion(question);
      try {
        setError(null);
        setPendingPrompt(KLAUS_SYSTEM_PROMPT + `\n\nBEGRÜSSUNG: Der Benutzer hat eine Schnellfrage ausgewählt. Beginne deine Antwort mit: 'Hallo, mein Name ist Klaus. Gerne berate ich Sie zu diesem Thema.' Dann beantworte die folgende Frage: "${question}"`);
        await connect({
          auth: {
            type: "accessToken" as const,
            value: accessToken,
          },
          hostname: "api.hume.ai",
          configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
        });
      } catch (err) {
        console.error("Connection error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage || "Verbindung fehlgeschlagen. Bitte überprüfen Sie Ihre Mikrofonberechtigungen.");
        setPendingQuestion(null);
      }
    }
  };

  const handleTextMessage = async (message: string) => {
    if (isLoading || searchInProgress) return;

    const userMessage: TextMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    
    setTextMessages(prev => [...prev, userMessage]);
    onMessageSent?.(message, "user");
    
    if (awaitingConfirmation && pendingSearch && detectConfirmation(message)) {
      console.log("Text-Modus: Benutzer bestätigt Suche für:", pendingSearch.term);
      await executeSearch(pendingSearch.term);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessageToAPI(message);
      
      const assistantMessage: TextMessage = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: response,
        timestamp: new Date(),
      };
      
      setTextMessages(prev => [...prev, assistantMessage]);
      onMessageSent?.(response, "assistant");
      
      const { isOffer, brandName } = detectSearchOffer(response);
      if (isOffer && brandName) {
        setPendingSearch({ term: brandName });
        setAwaitingConfirmation(true);
        console.log("Text-Modus: Klaus bietet Suche an für:", brandName);
      } else {
        setPendingSearch(null);
        setAwaitingConfirmation(false);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("Fehler bei der Kommunikation. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLoading || searchInProgress) return;
    
    const message = textInput.trim();
    setTextInput("");
    await handleTextMessage(message);
  };

  useEffect(() => {
    if (textChatRef.current && textMessages.length > 0) {
      const lastMessage = textChatRef.current.lastElementChild as HTMLElement;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [textMessages]);

  useEffect(() => {
    if (!contextMessage || contextMessageProcessed || isLoading) return;
    
    const isSystemContext = contextMessage.startsWith("[SYSTEM-KONTEXT");
    const isRisikoberatung = contextMessage.includes("Risikoberatung");
    
    if (inputMode === "text") {
      setContextMessageProcessed(true);
      
      const processTextContext = async () => {
        if (isSystemContext) {
          setIsLoading(true);
          try {
            const triggerMessage = isRisikoberatung 
              ? "Bitte präsentiere mir jetzt die Analyse der Marke basierend auf den Recherche-Ergebnissen."
              : "Ich möchte die Beratung fortsetzen, um die fehlenden Informationen zu ergänzen.";
            
            const response = await fetch("/api/ai/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                message: triggerMessage,
                systemContext: contextMessage
              }),
            });
            
            if (!response.ok) throw new Error("Chat request failed");
            
            const data = await response.json();
            const assistantMessage: TextMessage = {
              id: (Date.now() + 1).toString(),
              type: "assistant",
              content: data.response,
              timestamp: new Date()
            };
            setTextMessages(prev => [...prev, assistantMessage]);
            onMessageSent?.(data.response, "assistant");
          } catch (err) {
            console.error("Context chat error:", err);
            setError("Fehler bei der Kommunikation. Bitte versuchen Sie es erneut.");
          } finally {
            setIsLoading(false);
          }
        } else {
          await handleTextMessage(contextMessage);
        }
        onContextMessageConsumed?.();
      };
      
      processTextContext();
    } else {
      if (status.value === "connected") {
        setContextMessageProcessed(true);
        
        const voiceMessage = isRisikoberatung
          ? "Bitte präsentiere mir die Risikoanalyse für meine Marke."
          : isSystemContext 
            ? "Ich möchte die Beratung fortsetzen."
            : contextMessage;
        
        if (isSystemContext) {
          console.log("Voice connected: Updating session settings with context...");
          const updatedPrompt = isRisikoberatung
            ? KLAUS_SYSTEM_PROMPT + `\n\n${contextMessage}\n\nAUFGABE: Präsentiere sofort die Risikoanalyse. Beginne mit dem Markennamen, dem Gesamtrisiko, nenne die wichtigsten Konflikte und gib deine Empfehlung. Sei konkret und hilfreich.`
            : KLAUS_SYSTEM_PROMPT + `\n\n${contextMessage}\n\nBEGRÜSSUNG: Da dies eine Fortsetzung ist, beginne mit einer kurzen Zusammenfassung was du bereits weißt und frage dann nach den noch fehlenden Informationen.`;
          sendSessionSettings({
            systemPrompt: updatedPrompt
          });
        }
        sendUserInput(voiceMessage);
        onContextMessageConsumed?.();
      } else if (status.value === "disconnected") {
        setContextMessageProcessed(true);
        
        const voiceMessage = isRisikoberatung
          ? "Bitte präsentiere mir die Risikoanalyse für meine Marke."
          : isSystemContext 
            ? "Ich möchte die Beratung fortsetzen."
            : contextMessage;
        
        setPendingQuestion(voiceMessage);
        let fullPrompt = KLAUS_SYSTEM_PROMPT + (isSystemContext ? `\n\n${contextMessage}` : `\n\nKONTEXT: ${contextMessage}`);
        if (isRisikoberatung) {
          fullPrompt += `\n\nAUFGABE: Präsentiere sofort die Risikoanalyse. Beginne mit dem Markennamen, dem Gesamtrisiko, nenne die wichtigsten Konflikte und gib deine Empfehlung. Sei konkret und hilfreich.`;
        } else if (isSystemContext) {
          fullPrompt += `\n\nBEGRÜSSUNG: Da dies eine Fortsetzung ist, beginne mit einer kurzen Zusammenfassung was du bereits weißt und frage dann nach den noch fehlenden Informationen.`;
        }
        console.log("Voice context prepared (waiting for user click):", isRisikoberatung ? "RISIKOBERATUNG" : "SYSTEM-KONTEXT");
        setPendingPrompt(fullPrompt);
        
        onContextMessageConsumed?.();
      }
    }
  }, [contextMessage, contextMessageProcessed, isLoading, inputMode, status.value, autoStart]);

  useEffect(() => {
    if (contextMessage === null) {
      setContextMessageProcessed(false);
    }
  }, [contextMessage]);

  useEffect(() => {
    setContextMessageProcessed(false);
    setPendingSearch(null);
    setAwaitingConfirmation(false);
  }, [inputMode]);

  const isConnected = status.value === "connected";
  const isConnecting = status.value === "connecting";
  const isTextMode = inputMode === "text";

  return (
    <div className="w-full">
      <div className={`grid ${embedded ? '' : 'grid-cols-1 xl:grid-cols-5'} gap-4 lg:gap-6`}>
        <div className={`${embedded ? '' : 'xl:col-span-3'} bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100`}>
          {!embedded && (
            <div className="bg-gradient-to-r from-primary to-primary-light p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">KI-Markenberater</h3>
                  <p className="text-white/80 text-sm">
                    {isTextMode ? "Schriftliche Beratung" : "Sprachgesteuerte Beratung"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {(isSearching || searchInProgress) && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-400/30 text-white flex items-center gap-1.5">
                      <Search className="w-3 h-3 animate-pulse" />
                      Suche...
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isTextMode
                      ? 'bg-white/30 text-white'
                      : isReconnecting
                        ? 'bg-amber-400/30 text-white animate-pulse'
                        : isConnected 
                          ? 'bg-green-400/30 text-white' 
                          : 'bg-white/20 text-white/80'
                  }`}>
                    {isTextMode ? 'Text-Modus' : isReconnecting ? 'Verbinde neu...' : isConnecting ? 'Verbindet...' : isConnected ? 'Aktiv' : 'Bereit'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isTextMode ? (
            <div className="p-6 flex flex-col" style={{ minHeight: '400px' }}>
              <div 
                ref={textChatRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-80"
              >
                {textMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-primary" />
                    </div>
                    <div className="bg-gray-50 rounded-xl px-6 py-4 max-w-md mx-auto border border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Willkommen beim Markenberater!</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Ich begleite Sie Schritt für Schritt: von der Frage &quot;Brauche ich eine Marke?&quot; bis zu den nächsten konkreten Schritten zur Anmeldung.
                      </p>
                    </div>
                  </div>
                ) : (
                  textMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%]`}>
                        {msg.type === "assistant" && (
                          <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Markenberater
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.type === "user"
                              ? "bg-primary text-white rounded-tr-sm"
                              : "bg-gray-100 text-gray-800 rounded-tl-sm prose prose-sm max-w-none"
                          }`}
                        >
                          {msg.type === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-2 first:mt-0">{children}</h2>,
                                h2: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-2 first:mt-0">{children}</h3>,
                                h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>,
                                p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1.5 text-sm">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1.5 text-sm">{children}</ol>,
                                li: ({ children }) => <li className="text-sm text-gray-800">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {(isLoading || searchInProgress) && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Markenberater
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        {searchInProgress ? (
                          <>
                            <Search className="w-4 h-4 animate-pulse text-primary" />
                            <span className="text-sm text-gray-500">Führe Markenrecherche durch...</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-gray-500">Analysiert...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {remainingSearches < 5 && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  <span>Verbleibende Suchen: {remainingSearches}/5 pro Stunde</span>
                </div>
              )}

              <form onSubmit={handleTextSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Ihre Frage zum Markenrecht..."
                  disabled={isLoading || searchInProgress}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isLoading || searchInProgress}
                  className={`px-5 py-3 rounded-xl transition-all flex items-center justify-center ${
                    textInput.trim() && !isLoading && !searchInProgress
                      ? 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label="Nachricht senden"
                >
                  {isLoading || searchInProgress ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center">
              {autoStart && (isConnected || isConnecting) ? (
                <>
                  <div className="w-full flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {isConnected && (
                        <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                        </div>
                      )}
                      <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
                        {isConnecting ? 'Verbindet...' : isReconnecting ? 'Verbindet neu...' : 'Aktive Sprachsitzung'}
                      </span>
                      {(isSearching || searchInProgress) && (
                        <span className="text-sm text-amber-600 flex items-center gap-1.5">
                          <Search className="w-4 h-4 animate-pulse" />
                          Suche läuft...
                        </span>
                      )}
                    </div>
                    {isConnected && (
                      <button
                        onClick={handleToggle}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <MicOff className="w-4 h-4" />
                        Beenden
                      </button>
                    )}
                  </div>
                  
                  {error && (
                    <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-sm text-amber-700">
                      {error}
                    </div>
                  )}

                  <div className="w-full border-t border-gray-200 pt-4">
                    <Messages />
                  </div>
                </>
              ) : (
                <>
                  {!isConnected && !isConnecting && (
                    <div className="w-full max-w-md mb-6">
                      {pendingPrompt ? (
                        <div className="bg-primary/10 rounded-xl px-6 py-4 border border-primary/30 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <p className="text-sm font-semibold text-primary">Kontext bereit</p>
                          </div>
                          <p className="text-sm text-gray-700">
                            Klicken Sie auf &quot;Starten&quot;, um Ihre personalisierte Beratung zu beginnen.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl px-6 py-4 border border-gray-100 text-center">
                          <p className="text-sm font-medium text-gray-700 mb-1">Hallo! Ich bin Ihr KI-Markenberater.</p>
                          <p className="text-sm text-gray-600">
                            Klicken Sie auf &quot;Starten&quot; oder wählen Sie eine Schnellfrage.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="relative mb-6">
                    {isConnected && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute -inset-6 rounded-full border border-primary/30 animate-pulse" style={{ animationDuration: '3s' }} />
                      </>
                    )}
                    
                    <button
                      onClick={handleToggle}
                      disabled={isConnecting}
                      data-tour="start-button"
                      className={`
                        relative w-32 h-32 rounded-full flex items-center justify-center
                        transition-all duration-300 shadow-lg font-semibold text-base
                        ${isConnected 
                          ? 'bg-primary text-white hover:bg-primary-hover' 
                          : 'bg-gray-100 text-primary border-2 border-primary hover:bg-primary/10'
                        }
                        ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
                      `}
                      aria-label={isConnected ? "Sitzung beenden" : "Sitzung starten"}
                    >
                      {isConnecting ? (
                        <span className="text-sm">Lädt...</span>
                      ) : isConnected ? (
                        <div className="flex flex-col items-center gap-1">
                          <MicOff className="w-8 h-8" />
                          <span className="text-sm">Beenden</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Mic className="w-8 h-8" />
                          <span className="text-sm">Starten</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="w-full max-w-md p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 mb-1">Mikrofon nicht verfügbar</p>
                          <p className="text-sm text-amber-700 mb-3">
                            Wir konnten nicht auf Ihr Mikrofon zugreifen. Sie können entweder die Berechtigung in Ihrem Browser erlauben oder Ihre Frage direkt eintippen.
                          </p>
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Wechseln Sie oben zum &quot;Tippen&quot;-Modus</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full border-t border-gray-200 pt-4">
                    <Messages />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!embedded && customQuestions && customQuestions.length > 0 && (
          <div className="xl:col-span-2">
            <QuickQuestions 
              onQuestionClick={handleQuestionClick}
              customQuestions={customQuestions}
            />
          </div>
        )}
        {!embedded && !customQuestions && (
          <div className="xl:col-span-2">
            <QuickQuestions 
              onQuestionClick={handleQuestionClick}
            />
          </div>
        )}
      </div>
    </div>
  );
});

VoiceAssistant.displayName = "VoiceAssistant";

export default VoiceAssistant;
