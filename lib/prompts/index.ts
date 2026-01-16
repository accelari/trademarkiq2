/**
 * Zentrale Prompt-Verwaltung
 * Kombiniert globale Basis-Regeln mit akkordeon-spezifischen Regeln
 */

import { BASE_RULES } from './base-rules';
import { BeratungContext, getBeratungRules } from './beratung';
import { RechercheContext, getRechercheRules } from './recherche';
import { MarkennameContext, getMarkennameRules } from './markenname';
import { AnmeldungContext, getAnmeldungRules } from './anmeldung';

// Re-export types
export type { BeratungContext, RechercheContext, MarkennameContext, AnmeldungContext };

/**
 * Generiert den vollständigen Prompt für das Beratungs-Akkordeon
 */
export const getBeratungPrompt = (context: BeratungContext): string => {
  return `${getBeratungRules(context)}

${BASE_RULES}`;
};

/**
 * Generiert den vollständigen Prompt für das Recherche-Akkordeon
 */
export const getRecherchePrompt = (context: RechercheContext): string => {
  return `${getRechercheRules(context)}

${BASE_RULES}`;
};

/**
 * Generiert den vollständigen Prompt für das Markenname/Logo-Akkordeon
 */
export const getMarkennamePrompt = (context: MarkennameContext): string => {
  return `${getMarkennameRules(context)}

${BASE_RULES}`;
};

/**
 * Generiert den vollständigen Prompt für das Anmeldung-Akkordeon
 */
export const getAnmeldungPrompt = (context: AnmeldungContext): string => {
  return `${getAnmeldungRules(context)}

${BASE_RULES}`;
};

// Export für direkten Zugriff
export { BASE_RULES } from './base-rules';
export { getBeratungRules } from './beratung';
export { getRechercheRules } from './recherche';
export { getMarkennameRules } from './markenname';
export { getAnmeldungRules } from './anmeldung';
