import { pgTable, serial, text, integer, timestamp, real, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const electionStatusEnum = pgEnum("election_status", ["upcoming", "active", "closed"]);
export const fraudSeverityEnum = pgEnum("fraud_severity", ["low", "medium", "high", "critical"]);
export const fraudTypeEnum = pgEnum("fraud_type", [
  "duplicate_ip",
  "rapid_voting",
  "unusual_pattern",
  "bot_behavior",
  "coordinated_attack",
  "suspicious_timing",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "vote_cast",
  "fraud_detected",
  "election_started",
  "election_closed",
  "alert_resolved",
]);

export const electionsTable = pgTable("elections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: electionStatusEnum("status").notNull().default("upcoming"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalVotes: integer("total_votes").notNull().default(0),
  fraudScore: real("fraud_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => electionsTable.id).notNull(),
  name: text("name").notNull(),
  party: text("party"),
  bio: text("bio"),
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => electionsTable.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidatesTable.id).notNull(),
  voterId: text("voter_id").notNull(),
  voterIp: text("voter_ip"),
  metadata: jsonb("metadata"),
  flagged: boolean("flagged").notNull().default(false),
  castAt: timestamp("cast_at").defaultNow().notNull(),
});

export const fraudAlertsTable = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => electionsTable.id).notNull(),
  type: fraudTypeEnum("type").notNull(),
  severity: fraudSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  affectedVotes: integer("affected_votes").notNull().default(0),
  voterId: text("voter_id"),
  voterIp: text("voter_ip"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  electionId: integer("election_id").references(() => electionsTable.id).notNull(),
  electionTitle: text("election_title").notNull(),
  severity: text("severity").notNull().default("info"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertElectionSchema = createInsertSchema(electionsTable).omit({ id: true, totalVotes: true, fraudScore: true, createdAt: true });
export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ id: true, voteCount: true, createdAt: true });
export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, flagged: true, castAt: true });
export const insertFraudAlertSchema = createInsertSchema(fraudAlertsTable).omit({ id: true, resolved: true, resolvedAt: true, resolution: true, createdAt: true });

export type Election = typeof electionsTable.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Vote = typeof votesTable.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type FraudAlert = typeof fraudAlertsTable.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
