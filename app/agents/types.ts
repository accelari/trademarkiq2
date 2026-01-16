export interface AgentRequest {
  id: string;
  userPrompt: string;
  timestamp: Date;
  context?: any;
}

export interface AgentResponse {
  agentId: string;
  agentType: 'code' | 'design' | 'workflow' | 'qa';
  analysis: string;
  suggestions: string[];
  concerns: string[];
  filesToModify: string[];
  estimatedTime: number;
}

export interface CrossReviewComment {
  fromAgent: string;
  toAgent: string;
  comment: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FinalProposal {
  id: string;
  userRequest: string;
  summary: string;
  changes: {
    files: Array<{
      path: string;
      changeType: 'create' | 'modify' | 'delete';
      description: string;
    }>;
    database?: Array<{
      table: string;
      operation: 'create' | 'alter' | 'drop';
      description: string;
    }>;
    tests?: Array<{
      file: string;
      type: 'unit' | 'integration' | 'e2e';
      description: string;
    }>;
  };
  risks: string[];
  benefits: string[];
  estimatedTime: number;
  requiresConfirmation: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'code' | 'design' | 'workflow' | 'qa' | 'master';
  model: string;
  enabled: boolean;
  priority: number;
}
