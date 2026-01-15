/**
 * Zentrales Trigger-System für KI-Berater
 * 
 * Dieses Modul vereinheitlicht die Trigger-Verarbeitung für alle Akkordeons
 * (Beratung, Markenname, Recherche, Anmeldung) und eliminiert duplizierten Code.
 * 
 * Trigger-Format: [TRIGGER_NAME:wert] oder [TRIGGER_NAME]
 */

import { RefObject, Dispatch, SetStateAction } from "react";

// ============================================
// Typen
// ============================================

export interface RechercheForm {
  trademarkName: string;
  niceClasses: number[];
  countries: string[];
}

export type TrademarkType = "wortmarke" | "bildmarke" | "wort-bildmarke" | "";

export type AccordionType = "beratung" | "markenname" | "recherche" | "anmeldung" | "kommunikation" | "ueberwachung" | "fristen";

/**
 * Kontext für die Trigger-Verarbeitung
 * Enthält alle Setter und Refs, die für die Trigger-Verarbeitung benötigt werden
 */
export interface TriggerContext {
  // State Setters
  setManualNameInput: Dispatch<SetStateAction<string>>;
  setRechercheForm: Dispatch<SetStateAction<RechercheForm>>;
  setTrademarkType: Dispatch<SetStateAction<TrademarkType>>;
  setIsTrademarkTypeConfirmed: Dispatch<SetStateAction<boolean>>;
  setOpenAccordion: Dispatch<SetStateAction<string>>;
  
  // Refs für Flag-Management
  triggerChangeInProgressRef: RefObject<boolean>;
  lastNotifiedStateRef: RefObject<string>;
  
  // Aktuelle Werte (für lastNotifiedState Update)
  currentValues: {
    manualNameInput: string;
    rechercheForm: RechercheForm;
    trademarkType: TrademarkType;
    isTrademarkTypeConfirmed: boolean;
  };
}

/**
 * Ergebnis der Trigger-Verarbeitung
 */
export interface TriggerResult {
  hasAction: boolean;
  extractedValues: {
    marke?: string;
    klassen?: number[];
    laender?: string[];
    art?: TrademarkType;
    goto?: AccordionType;
  };
}

// ============================================
// Trigger-Definitionen (zentral)
// ============================================

/**
 * Liste aller Trigger, die aus der UI-Anzeige gefiltert werden sollen
 * Diese Liste wird auch in ClaudeAssistant.tsx verwendet
 */
export const TRIGGER_PATTERNS = {
  MARKE: /\[MARKE:([^\]]+)\]/,
  KLASSEN: /\[KLASSEN:([^\]]+)\]/,
  LAENDER: /\[LAENDER:([^\]]+)\]/,
  ART: /\[ART:(wortmarke|bildmarke|wort-bildmarke)\]/i,
  GOTO: /\[GOTO:(beratung|markenname|recherche|anmeldung|kommunikation|ueberwachung|fristen)\]/i,
  RECHERCHE_STARTEN: /\[RECHERCHE_STARTEN\]/,
  WEITERE_RECHERCHE: /\[WEITERE_RECHERCHE\]/,
  WEB_SUCHE: /\[WEB_SUCHE:([^\]]+)\]/,
  LOGO_GENERIEREN: /\[LOGO_GENERIEREN:?([^\]]*)\]/,
  LOGO_BEARBEITEN: /\[LOGO_BEARBEITEN:([^\]]+)\]/,
  WEITER: /\[WEITER:(markenname|recherche|anmeldung)\]/i,
  KOSTEN_BERECHNEN: /\[KOSTEN_BERECHNEN\]/,
} as const;

/**
 * Alle Trigger-Patterns als Array für UI-Filterung
 */
export const ALL_TRIGGER_REGEX = Object.values(TRIGGER_PATTERNS);

// ============================================
// Hilfsfunktionen
// ============================================

/**
 * Setzt das triggerChangeInProgressRef Flag und resettet es nach 100ms
 * Dies verhindert, dass KI-Trigger als manuelle Änderungen erkannt werden
 */
function setTriggerFlag(ref: RefObject<boolean>): void {
  if (ref.current !== undefined) {
    (ref as { current: boolean }).current = true;
    setTimeout(() => {
      (ref as { current: boolean }).current = false;
    }, 100);
  }
}

/**
 * Aktualisiert lastNotifiedStateRef nach Trigger-Verarbeitung
 * Dies verhindert Race Conditions bei der manuellen Änderungserkennung
 */
function updateLastNotifiedState(
  ref: RefObject<string>,
  values: {
    name: string;
    classes: number[];
    countries: string[];
    type: TrademarkType;
    typeConfirmed: boolean;
  }
): void {
  if (ref.current !== undefined) {
    (ref as { current: string }).current = JSON.stringify(values);
  }
}

// ============================================
// Gemeinsame Trigger-Verarbeitung
// ============================================

/**
 * Verarbeitet die gemeinsamen Trigger [MARKE:], [KLASSEN:], [LAENDER:], [ART:]
 * Diese Trigger werden in Beratung UND Recherche verwendet
 * 
 * @param content - Der Nachrichteninhalt
 * @param ctx - Der Trigger-Kontext mit allen Settern und Refs
 * @returns TriggerResult mit hasAction und extrahierten Werten
 */
export function processCommonTriggers(content: string, ctx: TriggerContext): TriggerResult {
  const result: TriggerResult = {
    hasAction: false,
    extractedValues: {},
  };

  // [MARKE:Name] - Markenname ändern
  const markeMatch = content.match(TRIGGER_PATTERNS.MARKE);
  if (markeMatch?.[1]) {
    result.hasAction = true;
    const name = markeMatch[1].trim();
    result.extractedValues.marke = name;
    
    setTriggerFlag(ctx.triggerChangeInProgressRef);
    ctx.setManualNameInput(name);
    ctx.setRechercheForm(prev => ({ ...prev, trademarkName: name }));
  }

  // [KLASSEN:01,03,09] - Klassen ändern
  const klassenMatch = content.match(TRIGGER_PATTERNS.KLASSEN);
  if (klassenMatch?.[1]) {
    const classes = klassenMatch[1]
      .split(",")
      .map((c: string) => parseInt(c.trim(), 10))
      .filter((n: number) => !isNaN(n) && n >= 1 && n <= 45);
    
    if (classes.length > 0) {
      result.hasAction = true;
      result.extractedValues.klassen = classes;
      
      setTriggerFlag(ctx.triggerChangeInProgressRef);
      ctx.setRechercheForm(prev => ({ ...prev, niceClasses: [...new Set(classes)] as number[] }));
    }
  }

  // [LAENDER:DE,US,EU] - Länder ändern
  const laenderMatch = content.match(TRIGGER_PATTERNS.LAENDER);
  if (laenderMatch?.[1]) {
    const codes = laenderMatch[1]
      .split(",")
      .map((c: string) => c.trim().toUpperCase())
      .filter((c: string) => c.length >= 2);
    
    if (codes.length > 0) {
      result.hasAction = true;
      result.extractedValues.laender = codes;
      
      setTriggerFlag(ctx.triggerChangeInProgressRef);
      ctx.setRechercheForm(prev => ({ ...prev, countries: [...new Set(codes)] as string[] }));
    }
  }

  // [ART:wortmarke] - Markenart ändern
  const artMatch = content.match(TRIGGER_PATTERNS.ART);
  if (artMatch?.[1]) {
    result.hasAction = true;
    const art = artMatch[1].toLowerCase() as TrademarkType;
    result.extractedValues.art = art;
    
    setTriggerFlag(ctx.triggerChangeInProgressRef);
    ctx.setTrademarkType(art);
    ctx.setIsTrademarkTypeConfirmed(true);
  }

  // Wenn Aktionen ausgeführt wurden, lastNotifiedState aktualisieren
  if (result.hasAction) {
    updateLastNotifiedState(ctx.lastNotifiedStateRef, {
      name: result.extractedValues.marke || ctx.currentValues.manualNameInput,
      classes: result.extractedValues.klassen || ctx.currentValues.rechercheForm.niceClasses,
      countries: result.extractedValues.laender || ctx.currentValues.rechercheForm.countries,
      type: result.extractedValues.art || ctx.currentValues.trademarkType,
      typeConfirmed: result.extractedValues.art ? true : ctx.currentValues.isTrademarkTypeConfirmed,
    });
  }

  return result;
}

/**
 * Verarbeitet den [GOTO:akkordeon] Trigger für Navigation
 * 
 * @param content - Der Nachrichteninhalt
 * @param ctx - Der Trigger-Kontext
 * @param currentAccordion - Das aktuell geöffnete Akkordeon
 * @returns true wenn Navigation ausgelöst wurde
 */
export function processGotoTrigger(
  content: string,
  ctx: TriggerContext,
  currentAccordion: string
): boolean {
  const gotoMatch = content.match(TRIGGER_PATTERNS.GOTO);
  if (gotoMatch?.[1]) {
    const target = gotoMatch[1].toLowerCase();
    // Nur navigieren wenn User NICHT bereits im Ziel-Akkordeon ist
    if (currentAccordion !== target) {
      setTimeout(() => {
        ctx.setOpenAccordion(target);
        window.location.hash = `#${target}`;
        const el = document.getElementById(`accordion-${target}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
      return true;
    }
  }
  return false;
}

// ============================================
// Akkordeon-spezifische Trigger-Verarbeitung
// ============================================

/**
 * Verarbeitet Beratung-spezifische Trigger
 * Inkludiert: Gemeinsame Trigger + [GOTO:]
 */
export function processBeratungTriggers(
  content: string,
  ctx: TriggerContext,
  currentAccordion: string
): TriggerResult {
  // Zuerst gemeinsame Trigger verarbeiten
  const result = processCommonTriggers(content, ctx);
  
  // [GOTO:akkordeon] - Navigation
  if (processGotoTrigger(content, ctx, currentAccordion)) {
    result.hasAction = true;
  }
  
  return result;
}

/**
 * Verarbeitet Recherche-spezifische Trigger
 * Inkludiert: Gemeinsame Trigger + [RECHERCHE_STARTEN], [WEITERE_RECHERCHE], [WEB_SUCHE:]
 * 
 * Hinweis: Die spezifischen Trigger [RECHERCHE_STARTEN], [WEITERE_RECHERCHE], [WEB_SUCHE:]
 * werden weiterhin in page.tsx verarbeitet, da sie komplexe State-Änderungen erfordern
 */
export function processRechercheTriggers(content: string, ctx: TriggerContext): TriggerResult {
  // Gemeinsame Trigger verarbeiten (mit korrektem Flag-Management)
  return processCommonTriggers(content, ctx);
}

/**
 * Prüft ob ein Recherche-spezifischer Trigger vorhanden ist
 * Diese Trigger werden in page.tsx separat verarbeitet
 */
export function hasRechercheSpecificTrigger(content: string): {
  rechercheStarten: boolean;
  weitereRecherche: boolean;
  webSuche: string | null;
} {
  return {
    rechercheStarten: TRIGGER_PATTERNS.RECHERCHE_STARTEN.test(content),
    weitereRecherche: TRIGGER_PATTERNS.WEITERE_RECHERCHE.test(content),
    webSuche: content.match(TRIGGER_PATTERNS.WEB_SUCHE)?.[1]?.trim() || null,
  };
}

/**
 * Prüft ob ein Markenname-spezifischer Trigger vorhanden ist
 * Diese Trigger werden in page.tsx separat verarbeitet
 */
export function hasMarkennameSpecificTrigger(content: string): {
  logoGenerieren: string | null;
  logoBearbeiten: string | null;
} {
  const logoGenMatch = content.match(TRIGGER_PATTERNS.LOGO_GENERIEREN);
  const logoEditMatch = content.match(TRIGGER_PATTERNS.LOGO_BEARBEITEN);
  
  return {
    logoGenerieren: logoGenMatch ? (logoGenMatch[1]?.trim() || "default") : null,
    logoBearbeiten: logoEditMatch?.[1]?.trim() || null,
  };
}

// ============================================
// UI-Filterung
// ============================================

/**
 * Entfernt alle Trigger aus einem Text für die UI-Anzeige
 * 
 * @param content - Der Nachrichteninhalt mit Triggern
 * @returns Der bereinigte Text ohne Trigger
 */
export function filterTriggersFromContent(content: string): string {
  let filtered = content;
  
  // Alle Trigger-Patterns entfernen
  for (const pattern of ALL_TRIGGER_REGEX) {
    filtered = filtered.replace(new RegExp(pattern.source, "gi"), "");
  }
  
  // Mehrfache Leerzeilen auf eine reduzieren
  filtered = filtered.replace(/\n{3,}/g, "\n\n");
  
  // Führende/trailing Whitespace entfernen
  filtered = filtered.trim();
  
  return filtered;
}

/**
 * Prüft ob ein Text Trigger enthält
 */
export function containsTriggers(content: string): boolean {
  return ALL_TRIGGER_REGEX.some(pattern => pattern.test(content));
}
