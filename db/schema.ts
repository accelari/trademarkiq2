import { pgTable, varchar, text, timestamp, integer, boolean, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  password: varchar("password", { length: 255 }),
  image: varchar("image", { length: 500 }),
  emailVerified: timestamp("email_verified"),
  isAdmin: boolean("is_admin").default(false),
  tourCompleted: boolean("tour_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}));

export const trademarkCases = pgTable("trademark_cases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: varchar("case_number", { length: 50 }).unique().notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  trademarkName: varchar("trademark_name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("case_user_idx").on(table.userId),
  caseNumberIdx: index("case_number_idx").on(table.caseNumber),
}));

export const caseSteps = pgTable("case_steps", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => trademarkCases.id, { onDelete: "cascade" }),
  step: varchar("step", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  skippedAt: timestamp("skipped_at"),
  skipReason: text("skip_reason"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_step_case_idx").on(table.caseId),
  stepIdx: index("case_step_step_idx").on(table.step),
}));

export const caseDecisions = pgTable("case_decisions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => trademarkCases.id, { onDelete: "cascade" }),
  trademarkNames: jsonb("trademark_names").$type<string[]>().default([]),
  trademarkType: varchar("trademark_type", { length: 50 }), // wortmarke, bildmarke, wort-bildmarke
  visitedAccordions: jsonb("visited_accordions").$type<string[]>().default([]), // Besuchte Akkordeons (für Begrüßungen)
  countries: jsonb("countries").$type<string[]>().default([]),
  niceClasses: jsonb("nice_classes").$type<number[]>().default([]),
  completenessScore: integer("completeness_score").default(0),
  confidenceScore: integer("confidence_score").default(0),
  needsConfirmation: boolean("needs_confirmation").default(false),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by", { length: 255 }),
  rawSummary: text("raw_summary"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_decision_case_idx").on(table.caseId),
}));

export const caseEvents = pgTable("case_events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => trademarkCases.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_event_case_idx").on(table.caseId),
  createdAtIdx: index("case_event_created_at_idx").on(table.createdAt),
}));

export const caseAnalyses = pgTable("case_analyses", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => trademarkCases.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  searchQuery: jsonb("search_query").$type<{
    trademarkName: string;
    countries: string[];
    niceClasses: number[];
  }>().notNull(),
  searchTermsUsed: jsonb("search_terms_used").$type<string[]>().default([]),
  conflicts: jsonb("conflicts").$type<{
    id: string;
    name: string;
    register: string;
    holder: string;
    classes: number[];
    accuracy: number;
    riskLevel: "high" | "medium" | "low";
    reasoning: string;
    status: string;
    applicationNumber: string;
    applicationDate: string | null;
    registrationNumber: string;
    registrationDate: string | null;
    isFamousMark: boolean;
  }[]>().default([]),
  aiAnalysis: jsonb("ai_analysis").$type<{
    nameAnalysis: string;
    searchStrategy: string;
    riskAssessment: string;
    overallRisk: "high" | "medium" | "low";
    recommendation: string;
    famousMarkDetected: boolean;
    famousMarkNames: string[];
  }>(),
  riskScore: integer("risk_score").default(0),
  riskLevel: varchar("risk_level", { length: 50 }).default("low"),
  totalResultsAnalyzed: integer("total_results_analyzed").default(0),
  alternativeNames: jsonb("alternative_names").$type<{
    name: string;
    riskScore: number;
    riskLevel: "low" | "medium" | "high" | "unknown";
    conflictCount: number;
    explanation?: string;
  }[]>().default([]),
  expertStrategy: jsonb("expert_strategy").$type<{
    originalName: string;
    rootExtraction: string;
    searchVariants: string[];
    phoneticsEnglish: string[];
    phoneticsGerman: string[];
    visualSimilar: string[];
    misspellings: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_analysis_case_idx").on(table.caseId),
  userIdx: index("case_analysis_user_idx").on(table.userId),
}));

export const consultations = pgTable("consultations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  transcript: text("transcript"),
  sessionProtocol: text("session_protocol"),
  duration: integer("duration"),
  mode: varchar("mode", { length: 50 }).default("text"),
  status: varchar("status", { length: 50 }).default("draft"),
  extractedData: jsonb("extracted_data").$type<{
    trademarkName?: string;
    countries?: string[];
    niceClasses?: number[];
    isComplete?: boolean;
  }>().default({}),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  caseId: varchar("case_id", { length: 255 }).references(() => trademarkCases.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("consultation_user_idx").on(table.userId),
  createdAtIdx: index("consultation_created_at_idx").on(table.createdAt),
  statusIdx: index("consultation_status_idx").on(table.status),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  consultations: many(consultations),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  user: one(users, { fields: [consultations.userId], references: [users.id] }),
  case: one(trademarkCases, { fields: [consultations.caseId], references: [trademarkCases.id] }),
}));

export const trademarkCasesRelations = relations(trademarkCases, ({ one, many }) => ({
  user: one(users, { fields: [trademarkCases.userId], references: [users.id] }),
  steps: many(caseSteps),
  decisions: many(caseDecisions),
  events: many(caseEvents),
  consultations: many(consultations),
  analyses: many(caseAnalyses),
  rechercheHistories: many(rechercheHistory),
}));

export const caseStepsRelations = relations(caseSteps, ({ one }) => ({
  case: one(trademarkCases, { fields: [caseSteps.caseId], references: [trademarkCases.id] }),
}));

export const caseDecisionsRelations = relations(caseDecisions, ({ one }) => ({
  case: one(trademarkCases, { fields: [caseDecisions.caseId], references: [trademarkCases.id] }),
}));

export const caseEventsRelations = relations(caseEvents, ({ one }) => ({
  case: one(trademarkCases, { fields: [caseEvents.caseId], references: [trademarkCases.id] }),
  user: one(users, { fields: [caseEvents.userId], references: [users.id] }),
}));

export const caseAnalysesRelations = relations(caseAnalyses, ({ one }) => ({
  case: one(trademarkCases, { fields: [caseAnalyses.caseId], references: [trademarkCases.id] }),
  user: one(users, { fields: [caseAnalyses.userId], references: [users.id] }),
}));

// Recherche-Historie: Speichert durchgeführte Markenrecherchen pro Case
export const rechercheHistory = pgTable("recherche_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => trademarkCases.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  trademarkType: varchar("trademark_type", { length: 50 }),
  countries: jsonb("countries").$type<string[]>().default([]),
  niceClasses: jsonb("nice_classes").$type<number[]>().default([]),
  riskScore: integer("risk_score").default(0),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),
  decision: varchar("decision", { length: 50 }),
  result: jsonb("result").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("recherche_history_case_idx").on(table.caseId),
  userIdx: index("recherche_history_user_idx").on(table.userId),
  createdAtIdx: index("recherche_history_created_at_idx").on(table.createdAt),
}));

export const rechercheHistoryRelations = relations(rechercheHistory, ({ one }) => ({
  case: one(trademarkCases, { fields: [rechercheHistory.caseId], references: [trademarkCases.id] }),
  user: one(users, { fields: [rechercheHistory.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
export type TrademarkCase = typeof trademarkCases.$inferSelect;
export type NewTrademarkCase = typeof trademarkCases.$inferInsert;
export type CaseStep = typeof caseSteps.$inferSelect;
export type NewCaseStep = typeof caseSteps.$inferInsert;
export type CaseDecision = typeof caseDecisions.$inferSelect;
export type NewCaseDecision = typeof caseDecisions.$inferInsert;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type NewCaseEvent = typeof caseEvents.$inferInsert;
export type CaseAnalysis = typeof caseAnalyses.$inferSelect;
export type NewCaseAnalysis = typeof caseAnalyses.$inferInsert;
export type RechercheHistory = typeof rechercheHistory.$inferSelect;
export type NewRechercheHistory = typeof rechercheHistory.$inferInsert;
