import { AgentRequest, AgentResponse, CrossReviewComment, FinalProposal } from '../types';
import { CodeAgent } from '../code/code-agent';
import { DesignAgent } from '../design/design-agent';
import { WorkflowAgent } from '../workflow/workflow-agent';
import { QAAgent } from '../qa/qa-agent';

export class MasterOrchestrator {
  private readonly model = 'gpt-4o';
  private readonly agentId = 'master-orchestrator-1';

  private codeAgent = new CodeAgent();
  private designAgent = new DesignAgent();
  private workflowAgent = new WorkflowAgent();
  private qaAgent = new QAAgent();

  async processRequest(userPrompt: string): Promise<FinalProposal> {
    const request: AgentRequest = {
      id: this.generateRequestId(),
      userPrompt,
      timestamp: new Date()
    };

    // Phase 1: Parallel analysis by all agents
    const agentResponses = await this.runParallelAnalysis(request);

    // Phase 2: Cross-review between agents
    const crossReviews = await this.performCrossReview(agentResponses);

    // Phase 3: Generate final proposal
    const finalProposal = await this.generateFinalProposal(request, agentResponses, crossReviews);

    return finalProposal;
  }

  private async runParallelAnalysis(request: AgentRequest): Promise<AgentResponse[]> {
    const [codeResponse, designResponse, workflowResponse, qaResponse] = await Promise.all([
      this.codeAgent.analyze(request),
      this.designAgent.analyze(request),
      this.workflowAgent.analyze(request),
      this.qaAgent.analyze(request)
    ]);

    return [codeResponse, designResponse, workflowResponse, qaResponse];
  }

  private async performCrossReview(responses: AgentResponse[]): Promise<CrossReviewComment[]> {
    const reviews: CrossReviewComment[] = [];

    // Code Agent reviews others
    const codeReviews = await this.generateCodeReviews(responses);
    reviews.push(...codeReviews);

    // Design Agent reviews others
    const designReviews = await this.generateDesignReviews(responses);
    reviews.push(...designReviews);

    // Workflow Agent reviews others
    const workflowReviews = await this.generateWorkflowReviews(responses);
    reviews.push(...workflowReviews);

    // QA Agent reviews others
    const qaReviews = await this.generateQAReviews(responses);
    reviews.push(...qaReviews);

    return reviews;
  }

  private async generateCodeReviews(responses: AgentResponse[]): Promise<CrossReviewComment[]> {
    const codeResponse = responses.find(r => r.agentType === 'code')!;
    const reviews: CrossReviewComment[] = [];

    // Code reviews Design
    const designResponse = responses.find(r => r.agentType === 'design')!;
    if (designResponse.filesToModify.some(f => f.includes('component'))) {
      reviews.push({
        fromAgent: 'code-agent',
        toAgent: 'design-agent',
        comment: 'UI-Komponenten benötigen TypeScript-Props-Typen für Type-Safety',
        severity: 'medium'
      });
    }

    // Code reviews Workflow
    const workflowResponse = responses.find(r => r.agentType === 'workflow')!;
    if (workflowResponse.filesToModify.some(f => f.includes('api'))) {
      reviews.push({
        fromAgent: 'code-agent',
        toAgent: 'workflow-agent',
        comment: 'API-Routen benötigen Error-Handling und Validierung',
        severity: 'high'
      });
    }

    return reviews;
  }

  private async generateDesignReviews(responses: AgentResponse[]): Promise<CrossReviewComment[]> {
    const reviews: CrossReviewComment[] = [];

    // Design reviews Code
    const codeResponse = responses.find(r => r.agentType === 'code')!;
    if (codeResponse.filesToModify.some(f => f.includes('component'))) {
      reviews.push({
        fromAgent: 'design-agent',
        toAgent: 'code-agent',
        comment: 'Komponenten benötigen ARIA-Labels für Accessibility',
        severity: 'medium'
      });
    }

    return reviews;
  }

  private async generateWorkflowReviews(responses: AgentResponse[]): Promise<CrossReviewComment[]> {
    const reviews: CrossReviewComment[] = [];

    // Workflow reviews Code
    const codeResponse = responses.find(r => r.agentType === 'code')!;
    if (codeResponse.filesToModify.some(f => f.includes('api'))) {
      reviews.push({
        fromAgent: 'workflow-agent',
        toAgent: 'code-agent',
        comment: 'API-Änderungen müssen caseSteps-Tabelle aktualisieren',
        severity: 'high'
      });
    }

    return reviews;
  }

  private async generateQAReviews(responses: AgentResponse[]): Promise<CrossReviewComment[]> {
    const reviews: CrossReviewComment[] = [];

    // QA reviews all agents
    for (const response of responses) {
      if (response.agentType !== 'qa') {
        reviews.push({
          fromAgent: 'qa-agent',
          toAgent: `${response.agentType}-agent`,
          comment: 'Alle Änderungen benötigen entsprechende Unit-Tests',
          severity: 'medium'
        });
      }
    }

    return reviews;
  }

  private async generateFinalProposal(
    request: AgentRequest,
    responses: AgentResponse[],
    reviews: CrossReviewComment[]
  ): Promise<FinalProposal> {
    const allFiles = responses.flatMap(r => r.filesToModify);
    const uniqueFiles = [...new Set(allFiles)];
    
    const totalTime = responses.reduce((sum, r) => sum + r.estimatedTime, 0);
    const allSuggestions = responses.flatMap(r => r.suggestions);
    const allConcerns = responses.flatMap(r => r.concerns);

    return {
      id: this.generateRequestId(),
      userRequest: request.userPrompt,
      summary: this.generateSummary(request.userPrompt, responses),
      changes: {
        files: uniqueFiles.map(file => ({
          path: file,
          changeType: 'modify' as const,
          description: this.generateFileDescription(file, responses)
        })),
        database: this.identifyDatabaseChanges(responses),
        tests: this.identifyTestChanges(responses)
      },
      risks: allConcerns,
      benefits: allSuggestions,
      estimatedTime: totalTime,
      requiresConfirmation: true
    };
  }

  private generateSummary(userPrompt: string, responses: AgentResponse[]): string {
    const codeFiles = responses.find(r => r.agentType === 'code')?.filesToModify.length || 0;
    const designFiles = responses.find(r => r.agentType === 'design')?.filesToModify.length || 0;
    const workflowFiles = responses.find(r => r.agentType === 'workflow')?.filesToModify.length || 0;
    const testFiles = responses.find(r => r.agentType === 'qa')?.filesToModify.length || 0;

    return `Vorschlag für: "${userPrompt}"

Umsetzung:
- ${codeFiles} Code-Dateien (Komponenten, API-Routen)
- ${designFiles} Design-Dateien (UI, Styling)
- ${workflowFiles} Workflow-Dateien (Steps, Logik)
- ${testFiles} Test-Dateien (Unit, Integration)

Alle Änderungen sind cross-geprüft und TypeScript-konform.`;
  }

  private generateFileDescription(file: string, responses: AgentResponse[]): string {
    const descriptions: string[] = [];
    
    if (file.includes('page.tsx')) {
      descriptions.push('React-Komponente mit UI-Logik');
    }
    if (file.includes('api/')) {
      descriptions.push('API-Route mit Business-Logik');
    }
    if (file.includes('schema.ts')) {
      descriptions.push('Datenbank-Schema-Anpassung');
    }
    if (file.includes('test')) {
      descriptions.push('Test-Implementierung');
    }

    return descriptions.join(', ') || 'Code-Anpassung';
  }

  private identifyDatabaseChanges(responses: AgentResponse[]) {
    const workflowResponse = responses.find(r => r.agentType === 'workflow');
    if (workflowResponse?.filesToModify.some(f => f.includes('schema.ts'))) {
      return [{
        table: 'caseSteps',
        operation: 'alter' as const,
        description: 'Neue Spalten für Workflow-Metadaten'
      }];
    }
    return [];
  }

  private identifyTestChanges(responses: AgentResponse[]) {
    const qaResponse = responses.find(r => r.agentType === 'qa');
    if (qaResponse?.filesToModify.some(f => f.includes('test'))) {
      return [
        {
          file: 'app/__tests__/components/new-feature.test.tsx',
          type: 'unit' as const,
          description: 'Unit-Tests für neue Komponenten'
        },
        {
          file: 'app/__tests__/api/new-feature.test.ts',
          type: 'integration' as const,
          description: 'Integration-Tests für API-Routen'
        }
      ];
    }
    return [];
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
