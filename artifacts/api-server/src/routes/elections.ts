import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { electionsTable, candidatesTable, votesTable, fraudAlertsTable, activityLogTable } from "@workspace/db/schema";
import { eq, sql, and, desc, count } from "drizzle-orm";

const router: IRouter = Router();

// List elections
router.get("/", async (req, res) => {
  try {
    const { status } = req.query as { status?: string };
    let query = db.select().from(electionsTable);
    if (status) {
      const elections = await db.select().from(electionsTable)
        .where(eq(electionsTable.status, status as "upcoming" | "active" | "closed"))
        .orderBy(desc(electionsTable.createdAt));
      return res.json(elections.map(serializeElection));
    }
    const elections = await db.select().from(electionsTable).orderBy(desc(electionsTable.createdAt));
    return res.json(elections.map(serializeElection));
  } catch (err) {
    req.log.error({ err }, "Failed to list elections");
    return res.status(500).json({ error: "internal_error", message: "Failed to list elections" });
  }
});

// Create election
router.post("/", async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "validation_error", message: "title, startDate, endDate are required" });
    }
    const [election] = await db.insert(electionsTable).values({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }).returning();
    await db.insert(activityLogTable).values({
      type: "election_started",
      description: `New election created: ${title}`,
      electionId: election.id,
      electionTitle: title,
      severity: "info",
    });
    return res.status(201).json(serializeElection(election));
  } catch (err) {
    req.log.error({ err }, "Failed to create election");
    return res.status(500).json({ error: "internal_error", message: "Failed to create election" });
  }
});

// Get single election with candidates
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, id));
    if (!election) {
      return res.status(404).json({ error: "not_found", message: "Election not found" });
    }
    const candidates = await db.select().from(candidatesTable).where(eq(candidatesTable.electionId, id));
    const total = election.totalVotes || 1;
    return res.json({
      ...serializeElection(election),
      candidates: candidates.map(c => ({
        ...c,
        percentage: total > 0 ? Math.round((c.voteCount / total) * 100 * 10) / 10 : 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get election");
    return res.status(500).json({ error: "internal_error", message: "Failed to get election" });
  }
});

// Update election
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status, startDate, endDate } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = new Date(endDate);
    const [updated] = await db.update(electionsTable).set(updates).where(eq(electionsTable.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Election not found" });
    }
    if (status === "closed") {
      await db.insert(activityLogTable).values({
        type: "election_closed",
        description: `Election closed: ${updated.title}`,
        electionId: updated.id,
        electionTitle: updated.title,
        severity: "info",
      });
    }
    return res.json(serializeElection(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update election");
    return res.status(500).json({ error: "internal_error", message: "Failed to update election" });
  }
});

// Get election results
router.get("/:id/results", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, id));
    if (!election) {
      return res.status(404).json({ error: "not_found", message: "Election not found" });
    }
    const candidates = await db.select().from(candidatesTable)
      .where(eq(candidatesTable.electionId, id));
    const total = election.totalVotes;
    const serializedCandidates = candidates.map(c => ({
      ...c,
      percentage: total > 0 ? Math.round((c.voteCount / total) * 100 * 10) / 10 : 0,
    }));
    const [alertCountResult] = await db.select({ count: count() }).from(fraudAlertsTable)
      .where(and(eq(fraudAlertsTable.electionId, id), eq(fraudAlertsTable.resolved, false)));
    const sorted = [...serializedCandidates].sort((a, b) => b.voteCount - a.voteCount);
    const winner = sorted[0] || null;
    return res.json({
      election: serializeElection(election),
      candidates: serializedCandidates,
      totalVotes: total,
      turnoutPercentage: 0,
      fraudAlertCount: alertCountResult?.count || 0,
      winner: winner ? { ...winner } : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get election results");
    return res.status(500).json({ error: "internal_error", message: "Failed to get election results" });
  }
});

// Add candidate to election
router.post("/:id/candidates", async (req, res) => {
  try {
    const electionId = parseInt(req.params.id);
    const { name, party, bio } = req.body;
    if (!name) {
      return res.status(400).json({ error: "validation_error", message: "name is required" });
    }
    const [candidate] = await db.insert(candidatesTable).values({
      electionId,
      name,
      party,
      bio,
    }).returning();
    return res.status(201).json({ ...candidate, percentage: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to add candidate");
    return res.status(500).json({ error: "internal_error", message: "Failed to add candidate" });
  }
});

function serializeElection(e: typeof electionsTable.$inferSelect) {
  return {
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

export default router;
