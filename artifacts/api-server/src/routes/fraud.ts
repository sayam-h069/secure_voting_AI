import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fraudAlertsTable, electionsTable, votesTable, activityLogTable } from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";

const router: IRouter = Router();

// List fraud alerts
router.get("/alerts", async (req, res) => {
  try {
    const { electionId, severity, resolved } = req.query as {
      electionId?: string;
      severity?: string;
      resolved?: string;
    };

    let alerts = await db.select({
      alert: fraudAlertsTable,
      electionTitle: electionsTable.title,
    }).from(fraudAlertsTable)
      .leftJoin(electionsTable, eq(fraudAlertsTable.electionId, electionsTable.id))
      .orderBy(desc(fraudAlertsTable.createdAt));

    let filtered = alerts;
    if (electionId) {
      filtered = filtered.filter(a => a.alert.electionId === parseInt(electionId));
    }
    if (severity) {
      filtered = filtered.filter(a => a.alert.severity === severity);
    }
    if (resolved !== undefined) {
      const resolvedBool = resolved === "true";
      filtered = filtered.filter(a => a.alert.resolved === resolvedBool);
    }

    return res.json(filtered.map(a => ({
      ...a.alert,
      electionTitle: a.electionTitle || "Unknown",
      createdAt: a.alert.createdAt.toISOString(),
      resolvedAt: a.alert.resolvedAt?.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list fraud alerts");
    return res.status(500).json({ error: "internal_error", message: "Failed to list fraud alerts" });
  }
});

// Resolve fraud alert
router.patch("/alerts/:id/resolve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { resolution, removeVotes } = req.body;
    if (!resolution) {
      return res.status(400).json({ error: "validation_error", message: "resolution is required" });
    }
    const [alert] = await db.update(fraudAlertsTable).set({
      resolved: true,
      resolvedAt: new Date(),
      resolution,
    }).where(eq(fraudAlertsTable.id, id)).returning();

    if (!alert) {
      return res.status(404).json({ error: "not_found", message: "Alert not found" });
    }

    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, alert.electionId));
    await db.insert(activityLogTable).values({
      type: "alert_resolved",
      description: `Fraud alert resolved: ${alert.type} in "${election?.title || "Unknown"}"`,
      electionId: alert.electionId,
      electionTitle: election?.title || "Unknown",
      severity: "info",
    });

    return res.json({
      ...alert,
      electionTitle: election?.title || "Unknown",
      createdAt: alert.createdAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to resolve fraud alert");
    return res.status(500).json({ error: "internal_error", message: "Failed to resolve fraud alert" });
  }
});

// AI Fraud Analysis
router.post("/analyze/:electionId", async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId);
    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, electionId));
    if (!election) {
      return res.status(404).json({ error: "not_found", message: "Election not found" });
    }

    const allVotes = await db.select().from(votesTable).where(eq(votesTable.electionId, electionId));
    const findings: { type: string; description: string; affectedVotes: number; severity: string }[] = [];
    let alertsCreated = 0;

    if (allVotes.length === 0) {
      return res.json({
        electionId,
        analysisTimestamp: new Date().toISOString(),
        overallRiskScore: 0,
        riskLevel: "low",
        findings: [],
        alertsCreated: 0,
        recommendation: "No votes cast yet. Nothing to analyze.",
      });
    }

    // Check IP clustering
    const ipMap = new Map<string, string[]>();
    for (const vote of allVotes) {
      if (vote.voterIp) {
        const arr = ipMap.get(vote.voterIp) || [];
        arr.push(vote.voterId);
        ipMap.set(vote.voterIp, arr);
      }
    }
    for (const [ip, voters] of ipMap.entries()) {
      if (voters.length >= 3) {
        findings.push({
          type: "duplicate_ip",
          description: `IP ${ip} used to cast ${voters.length} votes`,
          affectedVotes: voters.length,
          severity: voters.length >= 5 ? "critical" : "high",
        });
        await db.insert(fraudAlertsTable).values({
          electionId,
          type: "duplicate_ip",
          severity: voters.length >= 5 ? "critical" : "high",
          description: `AI Analysis: IP ${ip} used by ${voters.length} different voters`,
          affectedVotes: voters.length,
          voterIp: ip,
        });
        alertsCreated++;
      }
    }

    // Check rapid voting (votes within short windows)
    const sortedVotes = [...allVotes].sort((a, b) => a.castAt.getTime() - b.castAt.getTime());
    let burstStart = 0;
    for (let i = 1; i < sortedVotes.length; i++) {
      const diff = sortedVotes[i].castAt.getTime() - sortedVotes[burstStart].castAt.getTime();
      if (diff < 10000 && i - burstStart >= 5) {
        findings.push({
          type: "unusual_pattern",
          description: `${i - burstStart + 1} votes cast within ${Math.round(diff / 1000)}s — possible bot activity`,
          affectedVotes: i - burstStart + 1,
          severity: "critical",
        });
        await db.insert(fraudAlertsTable).values({
          electionId,
          type: "bot_behavior",
          severity: "critical",
          description: `AI Analysis: Burst of ${i - burstStart + 1} votes in ${Math.round(diff / 1000)}s detected`,
          affectedVotes: i - burstStart + 1,
        });
        alertsCreated++;
        burstStart = i;
      } else if (diff >= 10000) {
        burstStart = i;
      }
    }

    // Check for suspicious timing (e.g., all votes in off-hours)
    const nightVotes = allVotes.filter(v => {
      const h = v.castAt.getHours();
      return h >= 0 && h < 5;
    });
    if (nightVotes.length > 0 && nightVotes.length / allVotes.length > 0.4) {
      findings.push({
        type: "suspicious_timing",
        description: `${nightVotes.length} votes (${Math.round(nightVotes.length / allVotes.length * 100)}%) cast between midnight and 5am`,
        affectedVotes: nightVotes.length,
        severity: "medium",
      });
      await db.insert(fraudAlertsTable).values({
        electionId,
        type: "suspicious_timing",
        severity: "medium",
        description: `AI Analysis: Unusual concentration of votes during off-hours (midnight-5am)`,
        affectedVotes: nightVotes.length,
      });
      alertsCreated++;
    }

    // Calculate overall risk score
    const flaggedCount = allVotes.filter(v => v.flagged).length;
    const baseScore = (flaggedCount / Math.max(1, allVotes.length)) * 100;
    const findingPenalty = findings.reduce((acc, f) => {
      const s = f.severity === "critical" ? 20 : f.severity === "high" ? 10 : f.severity === "medium" ? 5 : 2;
      return acc + s;
    }, 0);
    const overallRiskScore = Math.min(100, Math.round(baseScore + findingPenalty));
    const riskLevel = overallRiskScore >= 70 ? "critical" : overallRiskScore >= 40 ? "high" : overallRiskScore >= 20 ? "medium" : "low";

    // Update election fraud score
    await db.update(electionsTable).set({ fraudScore: overallRiskScore }).where(eq(electionsTable.id, electionId));

    const recommendation =
      riskLevel === "critical"
        ? "Immediate review required. Consider pausing the election pending investigation."
        : riskLevel === "high"
        ? "Multiple fraud patterns detected. Manual audit of flagged votes recommended."
        : riskLevel === "medium"
        ? "Some suspicious patterns found. Monitor closely and investigate flagged votes."
        : "No significant fraud patterns detected. Election appears to be proceeding normally.";

    return res.json({
      electionId,
      analysisTimestamp: new Date().toISOString(),
      overallRiskScore,
      riskLevel,
      findings,
      alertsCreated,
      recommendation,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze election fraud");
    return res.status(500).json({ error: "internal_error", message: "Failed to analyze election fraud" });
  }
});

export default router;
