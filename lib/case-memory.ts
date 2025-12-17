import { db } from "@/db";
import { trademarkCases, caseSteps, caseDecisions, caseEvents, consultations } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export interface CaseMemory {
  caseNumber: string;
  trademarkName: string | null;
  countries: string[];
  niceClasses: number[];
  createdAt: string;
  updatedAt: string;

  timeline: {
    date: string;
    type: 'consultation' | 'research' | 'risk_analysis' | 'step_reset' | 'decision_update';
    summary: string;
    details?: Record<string, any>;
  }[];

  consultations: {
    sessionNumber: number;
    date: string;
    summary: string;
    extractedData?: {
      trademarkName?: string;
      countries?: string[];
      niceClasses?: number[];
    };
  }[];

  researches: {
    date: string;
    searchQuery: string;
    countries: string[];
    classes: number[];
    conflictsCount: number;
    topConflicts: { name: string; accuracy: number; register: string }[];
  }[];

  journeyStatus: {
    beratung: 'pending' | 'completed' | 'skipped';
    recherche: 'pending' | 'completed' | 'skipped';
    risikoanalyse: 'pending' | 'completed' | 'skipped';
    anmeldung: 'pending' | 'completed' | 'skipped';
    watchlist: 'pending' | 'completed' | 'skipped';
  };

  promptForAgent: string;
}

function formatDateDE(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mapEventTypeToTimelineType(eventType: string): CaseMemory['timeline'][0]['type'] {
  switch (eventType) {
    case 'consultation_completed':
    case 'consultation_started':
    case 'consultation':
      return 'consultation';
    case 'recherche_completed':
    case 'research_completed':
    case 'research':
      return 'research';
    case 'risk_analysis_completed':
    case 'risk_analysis':
      return 'risk_analysis';
    case 'step_reset':
    case 'steps_reset':
      return 'step_reset';
    case 'decision_updated':
    case 'decision_update':
    case 'decisions_extracted':
      return 'decision_update';
    default:
      return 'decision_update';
  }
}

function getStepStatus(steps: any[], stepName: string): 'pending' | 'completed' | 'skipped' {
  const step = steps.find(s => s.step === stepName);
  if (!step) return 'pending';
  if (step.skippedAt) return 'skipped';
  if (step.completedAt || step.status === 'completed') return 'completed';
  return 'pending';
}

export async function buildCaseMemory(caseId: string): Promise<CaseMemory | null> {
  const caseData = await db.query.trademarkCases.findFirst({
    where: eq(trademarkCases.id, caseId),
    with: {
      steps: {
        orderBy: [asc(caseSteps.createdAt)],
      },
      decisions: {
        orderBy: [desc(caseDecisions.extractedAt)],
      },
      events: {
        orderBy: [asc(caseEvents.createdAt)],
      },
      consultations: {
        orderBy: [asc(consultations.createdAt)],
      },
    },
  });

  if (!caseData) {
    return null;
  }

  const latestDecision = caseData.decisions?.[0];
  const trademarkName = caseData.trademarkName || latestDecision?.trademarkNames?.[0] || null;
  const countries: string[] = latestDecision?.countries || [];
  const niceClasses: number[] = latestDecision?.niceClasses || [];

  const timeline: CaseMemory['timeline'] = (caseData.events || []).map(event => ({
    date: formatDateDE(event.createdAt),
    type: mapEventTypeToTimelineType(event.eventType),
    summary: generateEventSummary(event.eventType, event.eventData as Record<string, any>),
    details: event.eventData as Record<string, any>,
  }));

  const consultationsList: CaseMemory['consultations'] = (caseData.consultations || []).map((c, index) => ({
    sessionNumber: index + 1,
    date: formatDateDE(c.createdAt),
    summary: c.summary || '',
    extractedData: c.extractedData as CaseMemory['consultations'][0]['extractedData'],
  }));

  const researches: CaseMemory['researches'] = [];
  const rechercheSteps = (caseData.steps || []).filter(
    s => s.step === 'recherche' && (s.status === 'completed' || s.completedAt)
  );
  
  for (const step of rechercheSteps) {
    const metadata = step.metadata as Record<string, any> || {};
    researches.push({
      date: formatDateDE(step.completedAt || step.createdAt),
      searchQuery: metadata.searchQuery || metadata.trademarkName || trademarkName || '',
      countries: metadata.countries || countries,
      classes: metadata.niceClasses || metadata.classes || niceClasses,
      conflictsCount: metadata.conflictsCount || metadata.totalConflicts || 0,
      topConflicts: (metadata.topConflicts || []).slice(0, 5).map((c: any) => ({
        name: c.name || c.markName || '',
        accuracy: c.accuracy || c.similarity || 0,
        register: c.register || c.office || '',
      })),
    });
  }

  const journeyStatus: CaseMemory['journeyStatus'] = {
    beratung: getStepStatus(caseData.steps || [], 'beratung'),
    recherche: getStepStatus(caseData.steps || [], 'recherche'),
    risikoanalyse: getStepStatus(caseData.steps || [], 'risikoanalyse'),
    anmeldung: getStepStatus(caseData.steps || [], 'anmeldung'),
    watchlist: getStepStatus(caseData.steps || [], 'watchlist'),
  };

  const promptForAgent = generatePromptForAgent({
    caseNumber: caseData.caseNumber,
    trademarkName,
    countries,
    niceClasses,
    consultations: consultationsList,
    researches,
    journeyStatus,
    timeline,
  });

  return {
    caseNumber: caseData.caseNumber,
    trademarkName,
    countries,
    niceClasses,
    createdAt: formatDateDE(caseData.createdAt),
    updatedAt: formatDateDE(caseData.updatedAt),
    timeline,
    consultations: consultationsList,
    researches,
    journeyStatus,
    promptForAgent,
  };
}

function generateEventSummary(eventType: string, eventData: Record<string, any>): string {
  switch (eventType) {
    case 'consultation_completed':
      return `Beratung abgeschlossen${eventData?.duration ? ` (${Math.round(eventData.duration / 60)} Min.)` : ''}`;
    case 'consultation_started':
      return 'Beratung gestartet';
    case 'recherche_completed':
    case 'research_completed':
      return `Recherche durchgeführt${eventData?.conflictsCount ? ` - ${eventData.conflictsCount} Konflikte gefunden` : ''}`;
    case 'risk_analysis_completed':
      return `Risikoanalyse abgeschlossen${eventData?.riskLevel ? ` - Risiko: ${eventData.riskLevel}` : ''}`;
    case 'step_reset':
    case 'steps_reset':
      return `Schritt(e) zurückgesetzt${eventData?.steps ? `: ${eventData.steps.join(', ')}` : ''}`;
    case 'decisions_extracted':
      return 'Entscheidungsdaten extrahiert';
    case 'decision_updated':
      return 'Entscheidungsdaten aktualisiert';
    case 'case_created':
      return 'Fall erstellt';
    case 'step_completed':
      return `Schritt "${eventData?.step || 'unbekannt'}" abgeschlossen`;
    case 'step_skipped':
      return `Schritt "${eventData?.step || 'unbekannt'}" übersprungen`;
    default:
      return eventData?.summary || `Ereignis: ${eventType}`;
  }
}

function generatePromptForAgent(data: {
  caseNumber: string;
  trademarkName: string | null;
  countries: string[];
  niceClasses: number[];
  consultations: CaseMemory['consultations'];
  researches: CaseMemory['researches'];
  journeyStatus: CaseMemory['journeyStatus'];
  timeline: CaseMemory['timeline'];
}): string {
  const { caseNumber, trademarkName, countries, niceClasses, consultations, researches, journeyStatus, timeline } = data;

  const consultationsSection = consultations.length > 0
    ? consultations.map(c => {
        const summaryPreview = c.summary.length > 200 ? c.summary.substring(0, 200) + '...' : c.summary;
        return `Session ${c.sessionNumber} (${c.date}): ${summaryPreview}`;
      }).join('\n')
    : 'Keine Beratungen durchgeführt';

  const recherchesSection = researches.length > 0
    ? researches.map(r => 
        `${r.date}: Suche "${r.searchQuery}" in ${r.countries.join(', ') || 'keine Länder'} - ${r.conflictsCount} Konflikte`
      ).join('\n')
    : 'Keine Recherchen durchgeführt';

  const journeyStatusSection = Object.entries(journeyStatus)
    .map(([step, status]) => `- ${step}: ${status}`)
    .join('\n');

  const lastActivities = timeline.slice(-5);
  const activitiesSection = lastActivities.length > 0
    ? lastActivities.map(t => `${t.date}: ${t.summary}`).join('\n')
    : 'Keine Aktivitäten vorhanden';

  return `FALL-GEDÄCHTNIS für ${caseNumber}:

AKTUELLE DATEN:
- Markenname: ${trademarkName || "Noch nicht festgelegt"}
- Zielländer: ${countries.length > 0 ? countries.join(", ") : "Noch nicht festgelegt"}
- Nizza-Klassen: ${niceClasses.length > 0 ? niceClasses.join(", ") : "Noch nicht festgelegt"}

BISHERIGE BERATUNGEN (${consultations.length} Sessions):
${consultationsSection}

RECHERCHE-HISTORY (${researches.length} Durchführungen):
${recherchesSection}

JOURNEY-STATUS:
${journeyStatusSection}

LETZTE AKTIVITÄTEN:
${activitiesSection}`;
}
