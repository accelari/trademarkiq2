import { MasterOrchestrator, ProposalGenerator } from './index';
import { FinalProposal } from './types';

export class MultiAgentHandler {
  private orchestrator = new MasterOrchestrator();
  private proposalGenerator = new ProposalGenerator();

  async handleUserRequest(userPrompt: string): Promise<string> {
    try {
      // Process the request through all agents
      const proposal = await this.orchestrator.processRequest(userPrompt);
      
      // Generate user-friendly proposal
      const friendlyProposal = this.proposalGenerator.generateUserFriendlyProposal(proposal);
      
      return friendlyProposal;
    } catch (error) {
      return `❌ **Fehler bei der Verarbeitung**  

Leider ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}

Bitte versuche es erneut oder formuliere deine Anforderung anders.`;
    }
  }

  async handleUserResponse(response: string, originalProposal: FinalProposal): Promise<string> {
    const normalizedResponse = response.toLowerCase().trim();
    
    if (normalizedResponse === 'ja' || normalizedResponse === 'yes' || normalizedResponse === 'j') {
      return this.executeProposal(originalProposal);
    }
    
    if (normalizedResponse === 'nein' || normalizedResponse === 'no' || normalizedResponse === 'n') {
      return this.proposalGenerator.generateRejectionMessage();
    }
    
    // Handle modification requests
    if (normalizedResponse.startsWith('ändern') || normalizedResponse.startsWith('anpassen') || normalizedResponse.includes('aber')) {
      return this.proposalGenerator.generateModificationRequest(originalProposal, response);
    }
    
    // Default: ask for clarification
    return `❓ **Unklare Antwort**

Bitte antworte mit:
- **"Ja"** → Vorschlag umsetzen
- **"Nein"** → Vorschlag verwerfen  
- **"Ändern" + deine Anmerkungen** → Vorschlag anpassen

Deine Antwort: "${response}"`;
  }

  private async executeProposal(proposal: FinalProposal): Promise<string> {
    try {
      // Start implementation
      const confirmationMessage = this.proposalGenerator.generateConfirmationMessage(proposal);
      
      // Here you would implement the actual changes
      // For now, we simulate the implementation
      await this.simulateImplementation(proposal);
      
      return confirmationMessage + '\n\n✅ **Alle Änderungen wurden erfolgreich umgesetzt!**';
    } catch (error) {
      return `❌ **Fehler bei der Umsetzung**

Leider ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}

Einige Änderungen wurden möglicherweise nicht vollständig umgesetzt.`;
    }
  }

  private async simulateImplementation(proposal: FinalProposal): Promise<void> {
    // Simulate implementation time based on estimated time
    const implementationTime = Math.min(proposal.estimatedTime * 100, 3000); // Max 3 seconds simulation
    await new Promise(resolve => setTimeout(resolve, implementationTime));
  }

  isProcessing(): boolean {
    // Track if any agent is currently processing
    return false; // This would be implemented with actual state tracking
  }

  getCurrentStatus(): string {
    return 'Bereit für neue Anfragen';
  }
}
