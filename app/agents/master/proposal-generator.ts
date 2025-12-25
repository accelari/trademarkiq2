import { FinalProposal } from '../types';

export class ProposalGenerator {
  generateUserFriendlyProposal(proposal: FinalProposal): string {
    const { summary, changes, risks, benefits, estimatedTime } = proposal;

    let output = `## 🎯 Vorschlag für: "${proposal.userRequest}"

${summary}

---

### 📋 Änderungen Übersicht`;

    // Files section
    if (changes.files.length > 0) {
      output += `\n\n**📁 Dateien (${changes.files.length}):**`;
      changes.files.forEach(file => {
        const emoji = this.getFileEmoji(file.path);
        output += `\n${emoji} \`${file.path}\` - ${file.description}`;
      });
    }

    // Database section
    if (changes.database && changes.database.length > 0) {
      output += `\n\n**🗄️ Datenbank (${changes.database.length}):**`;
      changes.database.forEach(db => {
        output += `\n🔧 \`${db.table}\` - ${db.description}`;
      });
    }

    // Tests section
    if (changes.tests && changes.tests.length > 0) {
      output += `\n\n**🧪 Tests (${changes.tests.length}):**`;
      changes.tests.forEach(test => {
        output += `\n✅ \`${test.file}\` - ${test.description}`;
      });
    }

    // Benefits section
    if (benefits.length > 0) {
      output += `\n\n### ✨ Vorteile`;
      benefits.slice(0, 5).forEach(benefit => {
        output += `\n• ${benefit}`;
      });
      if (benefits.length > 5) {
        output += `\n• ... und ${benefits.length - 5} weitere`;
      }
    }

    // Risks section
    if (risks.length > 0) {
      output += `\n\n### ⚠️ Risiken`;
      risks.slice(0, 3).forEach(risk => {
        output += `\n• ${risk}`;
      });
      if (risks.length > 3) {
        output += `\n• ... und ${risks.length - 3} weitere`;
      }
    }

    // Time estimation
    output += `\n\n### ⏱️ Geschätzte Zeit: ${estimatedTime} Minuten`;

    // Call to action
    output += `\n\n---

## 🤔 Entscheidung

**Möchtest du diesen Vorschlag umsetzen?**

Antworte mit:
- **"Ja"** → Ich implementiere alle Änderungen sofort
- **"Nein"** → Ich verwerfe den Vorschlag
- **"Ändern"** + deine Anmerkungen → Ich passe den Vorschlag an`;

    return output;
  }

  private getFileEmoji(filePath: string): string {
    if (filePath.includes('page.tsx')) return '📄';
    if (filePath.includes('component')) return '🧩';
    if (filePath.includes('api/')) return '🔌';
    if (filePath.includes('schema.ts')) return '🗄️';
    if (filePath.includes('test')) return '🧪';
    if (filePath.includes('types')) return '📝';
    if (filePath.includes('.css')) return '🎨';
    return '📁';
  }

  generateConfirmationMessage(proposal: FinalProposal): string {
    return `✅ **Vorschlag wird umgesetzt...**

Ich implementiere jetzt:
- ${proposal.changes.files.length} Dateiänderungen
- ${proposal.changes.database?.length || 0} Datenbank-Anpassungen  
- ${proposal.changes.tests?.length || 0} Tests

Geschätzte Zeit: ${proposal.estimatedTime} Minuten

Bitte warten, die Änderungen werden durchgeführt...`;
  }

  generateRejectionMessage(): string {
    return `❌ **Vorschlag verworfen**

Der Vorschlag wurde nicht umgesetzt. 
Möchtest du eine alternative Lösung oder eine Anpassung?`;
  }

  generateModificationRequest(originalProposal: FinalProposal, userFeedback: string): string {
    return `🔄 **Vorschlag wird angepasst...**

Dein Feedback: "${userFeedback}"

Ich analysiere deine Anmerkungen und erstelle einen neuen Vorschlag...
Bitte warten...`;
  }
}
