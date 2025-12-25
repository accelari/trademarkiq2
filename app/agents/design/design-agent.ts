import { AgentRequest, AgentResponse } from '../types';

export class DesignAgent {
  private readonly model = 'claude-3.5-sonnet';
  private readonly agentId = 'design-agent-1';

  async analyze(request: AgentRequest): Promise<AgentResponse> {
    const analysis = await this.performDesignAnalysis(request.userPrompt);
    const suggestions = await this.generateDesignSuggestions(request.userPrompt);
    const concerns = await this.identifyDesignConcerns(request.userPrompt);
    const filesToModify = await this.identifyDesignFiles(request.userPrompt);

    return {
      agentId: this.agentId,
      agentType: 'design',
      analysis,
      suggestions,
      concerns,
      filesToModify,
      estimatedTime: this.estimateDesignTime(filesToModify)
    };
  }

  private async performDesignAnalysis(prompt: string): Promise<string> {
    return `
Design-Analyse für Anforderung: "${prompt}"

UI/UX-Anforderungen:
- Konsistentes Design mit bestehenden Komponenten
- Responsive Design für Mobile/Desktop
- Accessibility (WCAG 2.1 AA) konform
- Intuitive User-Interaktionen

Design-System:
- TailwindCSS Color-Schema verwenden
- Lucide Icons für konsistente Icons
- shadcn/ui Komponenten nutzen
- Schrift: Inter (bestehend)

User-Flow:
- Minimale Klicks zum Ziel
- Klare visuelle Hierarchie
- Feedback für alle Aktionen
- Error-States freundlich gestalten
    `.trim();
  }

  private async generateDesignSuggestions(prompt: string): Promise<string[]> {
    return [
      'Modal-Dialog für neue Features verwenden',
      'Loading-Skelette für bessere Wahrnehmung',
      'Toast-Notifications für Erfolgsmeldungen',
      'Tooltip für komplexe Interaktionen',
      'Progress-Indicator für mehrschrittige Prozesse',
      'Keyboard-Navigation implementieren',
      'Dark-Mode Unterstützung prüfen'
    ];
  }

  private async identifyDesignConcerns(prompt: string): Promise<string[]> {
    return [
      'Color-Contrast-Verhältnisse prüfen',
      'Screen-Reader-Labels hinzufügen',
      'Touch-Target-Größen optimieren',
      'Focus-States für Keyboard-Navigation',
      'Responsive Breakpoints validieren',
      'Animation-Performance optimieren'
    ];
  }

  private async identifyDesignFiles(prompt: string): Promise<string[]> {
    return [
      'app/components/ui/accordion.tsx',
      'app/components/ui/button.tsx',
      'app/components/ui/modal.tsx',
      'app/dashboard/case/[caseId]/page.tsx',
      'app/globals.css',
      'tailwind.config.ts'
    ];
  }

  private estimateDesignTime(files: string[]): number {
    // Base time + 3 minutes per design file
    return 8 + (files.length * 3);
  }

  async reviewDesignChanges(changes: any[]): Promise<string[]> {
    const review: string[] = [];
    
    for (const change of changes) {
      if (change.type === 'component') {
        review.push(`UI-Komponente ${change.path}: Accessibility prüfen`);
      }
      if (change.type === 'layout') {
        review.push(`Layout ${change.path}: Responsive-Verhalten testen`);
      }
      if (change.type === 'styling') {
        review.push(`Styling ${change.path}: Color-Contrast validieren`);
      }
    }

    return review;
  }
}
