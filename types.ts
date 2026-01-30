
export enum Agent {
  SUPERVISOR = 'SUPERVISOR',
  CURRICULUM_PLANNER = 'CURRICULUM_PLANNER',
  CONCEPT_EXPLAINER = 'CONCEPT_EXPLAINER',
  QUIZ_GENERATOR = 'QUIZ_GENERATOR',
  FEEDBACK_ANALYZER = 'FEEDBACK_ANALYZER',
  MOTIVATOR = 'MOTIVATOR',
  QUALITY_REVIEWER = 'QUALITY_REVIEWER',
  HUMAN_APPROVAL = 'HUMAN_APPROVAL',
  END = 'END'
}

export interface SharedState {
  topic: string;
  difficulty: string;
  lessonPlan: string | null;
  explanation: string | null;
  quiz: string | null;
  studentAnswers: string | null;
  feedback: string | null;
  motivatorMessage: string | null;
  reviewerApproved: boolean | null;
  reviewerComments: string | null;
  confidence: number;
  turnCount: number;
  maxTurns: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  agent: Agent;
  reason?: string;
  content: string;
  type: 'decision' | 'output' | 'error' | 'status';
}

export const AGENT_COLORS: Record<Agent, string> = {
  [Agent.SUPERVISOR]: 'bg-slate-700',
  [Agent.CURRICULUM_PLANNER]: 'bg-indigo-600',
  [Agent.CONCEPT_EXPLAINER]: 'bg-emerald-600',
  [Agent.QUIZ_GENERATOR]: 'bg-amber-600',
  [Agent.FEEDBACK_ANALYZER]: 'bg-rose-600',
  [Agent.MOTIVATOR]: 'bg-cyan-600',
  [Agent.QUALITY_REVIEWER]: 'bg-violet-600',
  [Agent.HUMAN_APPROVAL]: 'bg-orange-600',
  [Agent.END]: 'bg-red-600',
};

export const AGENT_ICONS: Record<Agent, string> = {
  [Agent.SUPERVISOR]: 'fa-user-tie',
  [Agent.CURRICULUM_PLANNER]: 'fa-map',
  [Agent.CONCEPT_EXPLAINER]: 'fa-chalkboard-user',
  [Agent.QUIZ_GENERATOR]: 'fa-question-circle',
  [Agent.FEEDBACK_ANALYZER]: 'fa-magnifying-glass-chart',
  [Agent.MOTIVATOR]: 'fa-fire',
  [Agent.QUALITY_REVIEWER]: 'fa-clipboard-check',
  [Agent.HUMAN_APPROVAL]: 'fa-user-check',
  [Agent.END]: 'fa-flag-checkered',
};
