import { AgentRequest, AgentResponse } from '../types';

export class WorkflowAgent {
  private readonly model = 'gpt-4o';
  private readonly agentId = 'workflow-agent-1';

  async analyze(request: AgentRequest): Promise<AgentResponse> {
    const analysis = await this.performWorkflowAnalysis(request.userPrompt);
    const suggestions = await this.generateWorkflowSuggestions(request.userPrompt);
    const concerns = await this.identifyWorkflowConcerns(request.userPrompt);
    const filesToModify = await this.identifyWorkflowFiles(request.userPrompt);

    return {
      agentId: this.agentId,
      agentType: 'workflow',
      analysis,
      suggestions,
      concerns,
      filesToModify,
      estimatedTime: this.estimateWorkflowTime(filesToModify)
    };
  }

  private async performWorkflowAnalysis(prompt: string): Promise<string> {
    return `
Workflow-Analyse für Anforderung: "${prompt}"

Business-Logik:
- Schrittweise Abfolge definieren
- Status-Übergänge klar modellieren
- Fehlerbehandlungs-Pfade berücksichtigen
- Rollenberechtigungen prüfen

Prozess-Integration:
- Bestehende Steps: Beratung → Markenname → Recherche → Analyse → Überprüfung → Anmeldung
- Datenfluss zwischen Steps sicherstellen
- State-Persistence über Sessions hinweg
- Undo/Redo Funktionalität prüfen

Daten-Modell:
- caseSteps Tabelle erweitern
- Metadata-Felder nutzen
- Events für Änderungen loggen
- Konsistente Namenskonventionen
    `.trim();
  }

  private async generateWorkflowSuggestions(prompt: string): Promise<string[]> {
    return [
      'Neuen Workflow-Step in WORKFLOW_STEPS definieren',
      'Status-Übergänge in caseSteps abbilden',
      'Automatische Status-Updates implementieren',
      'Event-Logging für Nachverfolgbarkeit',
      'Skip-Funktionalität für optionale Steps',
      'Bedingte Verzweigungen einbauen',
      'Parallel-Steps wo möglich nutzen'
    ];
  }

  private async identifyWorkflowConcerns(prompt: string): Promise<string[]> {
    return [
      'Status-Konsistenz über mehrere API-Aufrufe',
      'Race-Conditions bei parallelen Operationen',
      'Daten-Integrität bei Abbrüchen',
      'Rollback-Möglichkeiten bei Fehlern',
      'Performance bei vielen Steps',
      'User-Permissions für Step-Übergänge'
    ];
  }

  private async identifyWorkflowFiles(prompt: string): Promise<string[]> {
    return [
      'app/dashboard/case/[caseId]/page.tsx',
      'app/api/cases/[caseId]/steps/route.ts',
      'app/api/cases/[caseId]/skip/route.ts',
      'db/schema.ts',
      'app/types/workflow.ts',
      'app/api/cases/[caseId]/full/route.ts'
    ];
  }

  private estimateWorkflowTime(files: string[]): number {
    // Base time + 7 minutes per workflow file
    return 12 + (files.length * 7);
  }

  async reviewWorkflowChanges(changes: any[]): Promise<string[]> {
    const review: string[] = [];
    
    for (const change of changes) {
      if (change.type === 'step') {
        review.push(`Workflow-Step ${change.step}: Status-Übergänge prüfen`);
      }
      if (change.type === 'api') {
        review.push(`API-Route ${change.path}: Side-Effects behandeln`);
      }
      if (change.type === 'database') {
        review.push(`DB-Schema ${change.table}: Constraints validieren`);
      }
    }

    return review;
  }
}
