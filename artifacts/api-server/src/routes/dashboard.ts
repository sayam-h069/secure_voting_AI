import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { electionsTable, fraudAlertsTable, votesTable, activityLogTable } from "@workspace/db/schema";
import { eq, count, desc, and, sql } from "drizzle-orm";

const router: IRouter = Router();

// Dashboard summary
router.get("/summary", async (req, res) => {
  try {
    const elections = await db.select().from(electionsTable).orderBy(desc(electionsTable.createdAt));
    const totalVotesCast = elections.reduce((sum, e) => sum + e.totalVotes, 0);
    const totalElections = elections.length;
    const activeElections = elections.filter(e => e.status === "active").length;

    const [openAlerts] = await db.select({ count: count() }).from(fraudAlertsTable).where(eq(fraudAlertsTable.resolved, false));
    const [resolvedAlerts] = await db.select({ count: count() }).from(fraudAlertsTable).where(eq(fraudAlertsTable.resolved, true));

    const upcoming = elections.filter(e => e.status === "upcoming").length;
    const active = elections.filter(e => e.status === "active").length;
    const closed = elections.filter(e => e.status === "closed").length;
    const recentElections = elections.slice(0, 5).map(serializeElection);

    return res.json({
      totalElections,
      activeElections,
      totalVotesCast,
      fraudAlertsOpen: Number(openAlerts?.count || 0),
      fraudAlertsResolved: Number(resolvedAlerts?.count || 0),
      electionsByStatus: { upcoming, active, closed },
      recentElections,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    return res.status(500).json({ error: "internal_error", message: "Failed to get dashboard summary" });
  }
});

// Recent activity
router.get("/activity", async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || "20");
    const activities = await db.select().from(activityLogTable)
      .orderBy(desc(activityLogTable.timestamp))
      .limit(limit);
    return res.json(activities.map(a => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    return res.status(500).json({ error: "internal_error", message: "Failed to get recent activity" });
  }
});

// Fraud stats
router.get("/fraud-stats", async (req, res) => {
  try {
    const allAlerts = await db.select().from(fraudAlertsTable);
    const totalAlerts = allAlerts.length;

    const typeMap = new Map<string, number>();
    const severityMap = { low: 0, medium: 0, high: 0, critical: 0 };
    let resolved = 0;
    for (const a of allAlerts) {
      typeMap.set(a.type, (typeMap.get(a.type) || 0) + 1);
      severityMap[a.severity] = (severityMap[a.severity] || 0) + 1;
      if (a.resolved) resolved++;
    }

    const alertsByType = Array.from(typeMap.entries()).map(([type, cnt]) => ({ type, count: cnt }));
    const resolutionRate = totalAlerts > 0 ? Math.round((resolved / totalAlerts) * 100) : 0;

    const elections = await db.select().from(electionsTable)
      .orderBy(desc(electionsTable.fraudScore)).limit(5);

    const topRiskyElections = await Promise.all(elections.map(async e => {
      const [alertCount] = await db.select({ count: count() }).from(fraudAlertsTable)
        .where(eq(fraudAlertsTable.electionId, e.id));
      return {
        electionId: e.id,
        electionTitle: e.title,
        fraudScore: e.fraudScore,
        alertCount: Number(alertCount?.count || 0),
      };
    }));

    return res.json({
      totalAlerts,
      alertsByType,
      alertsBySeverity: severityMap,
      resolutionRate,
      topRiskyElections: topRiskyElections.filter(e => e.alertCount > 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get fraud stats");
    return res.status(500).json({ error: "internal_error", message: "Failed to get fraud stats" });
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
