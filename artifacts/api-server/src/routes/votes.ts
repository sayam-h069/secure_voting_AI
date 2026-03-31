import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { votesTable, electionsTable, candidatesTable, fraudAlertsTable, activityLogTable } from "@workspace/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

const router: IRouter = Router();

// Cast a vote
router.post("/", async (req, res) => {
  try {
    const { electionId, candidateId, voterId, voterIp, metadata } = req.body;
    if (!electionId || !candidateId || !voterId) {
      return res.status(400).json({ error: "validation_error", message: "electionId, candidateId, voterId are required" });
    }

    // Check if already voted
    const existing = await db.select().from(votesTable)
      .where(and(eq(votesTable.electionId, electionId), eq(votesTable.voterId, voterId)));
    if (existing.length > 0) {
      return res.status(400).json({ error: "already_voted", message: "You have already voted in this election" });
    }

    // Check election exists and is active
    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, electionId));
    if (!election) {
      return res.status(404).json({ error: "not_found", message: "Election not found" });
    }
    if (election.status !== "active") {
      return res.status(400).json({ error: "election_not_active", message: "Election is not currently active" });
    }

    // Check for fraud signals
    let fraudFlag = false;
    const clientIp = voterIp || req.ip || "unknown";

    // Check for duplicate IP
    if (clientIp !== "unknown") {
      const ipVotes = await db.select({ count: count() }).from(votesTable)
        .where(and(eq(votesTable.electionId, electionId), eq(votesTable.voterIp, clientIp)));
      if ((ipVotes[0]?.count || 0) >= 3) {
        fraudFlag = true;
        await db.insert(fraudAlertsTable).values({
          electionId,
          type: "duplicate_ip",
          severity: "high",
          description: `Multiple votes from IP ${clientIp} detected in election "${election.title}"`,
          affectedVotes: Number(ipVotes[0]?.count || 0) + 1,
          voterId,
          voterIp: clientIp,
        });
        await db.insert(activityLogTable).values({
          type: "fraud_detected",
          description: `Duplicate IP fraud detected in "${election.title}"`,
          electionId,
          electionTitle: election.title,
          severity: "danger",
        });
      }
    }

    // Check for rapid voting (votes in last minute from same IP)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const rapidVotes = await db.execute(
      sql`SELECT COUNT(*) as count FROM votes WHERE election_id = ${electionId} AND voter_ip = ${clientIp} AND cast_at > ${oneMinuteAgo}`
    );
    const rapidCount = Number((rapidVotes.rows[0] as { count: string }).count);
    if (rapidCount >= 2) {
      fraudFlag = true;
      await db.insert(fraudAlertsTable).values({
        electionId,
        type: "rapid_voting",
        severity: "critical",
        description: `Rapid voting pattern detected: ${rapidCount} votes in 60 seconds from IP ${clientIp}`,
        affectedVotes: rapidCount + 1,
        voterId,
        voterIp: clientIp,
      });
    }

    // Insert the vote
    const [vote] = await db.insert(votesTable).values({
      electionId,
      candidateId,
      voterId,
      voterIp: clientIp,
      metadata,
      flagged: fraudFlag,
    }).returning();

    // Update counts
    await db.update(electionsTable)
      .set({ totalVotes: sql`${electionsTable.totalVotes} + 1` })
      .where(eq(electionsTable.id, electionId));

    await db.update(candidatesTable)
      .set({ voteCount: sql`${candidatesTable.voteCount} + 1` })
      .where(eq(candidatesTable.id, candidateId));

    // Log activity
    await db.insert(activityLogTable).values({
      type: "vote_cast",
      description: `Vote cast in election "${election.title}"`,
      electionId,
      electionTitle: election.title,
      severity: fraudFlag ? "warning" : "info",
    });

    // Update fraud score on election if flagged
    if (fraudFlag) {
      const alertCount = await db.select({ count: count() }).from(fraudAlertsTable)
        .where(eq(fraudAlertsTable.electionId, electionId));
      const totalVotesNow = election.totalVotes + 1;
      const fraudScore = Math.min(100, ((Number(alertCount[0]?.count || 0)) / Math.max(1, totalVotesNow)) * 200);
      await db.update(electionsTable).set({ fraudScore }).where(eq(electionsTable.id, electionId));
    }

    return res.status(201).json({
      success: true,
      voteId: vote.id,
      fraudFlag,
      message: fraudFlag ? "Vote cast but suspicious activity detected" : "Vote cast successfully",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to cast vote");
    return res.status(500).json({ error: "internal_error", message: "Failed to cast vote" });
  }
});

// Check vote status
router.get("/check", async (req, res) => {
  try {
    const { electionId, voterId } = req.query as { electionId: string; voterId: string };
    if (!electionId || !voterId) {
      return res.status(400).json({ error: "validation_error", message: "electionId and voterId are required" });
    }
    const votes = await db.select().from(votesTable)
      .where(and(eq(votesTable.electionId, parseInt(electionId)), eq(votesTable.voterId, voterId)));
    const hasVoted = votes.length > 0;
    return res.json({
      hasVoted,
      candidateId: hasVoted ? votes[0].candidateId : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to check vote status");
    return res.status(500).json({ error: "internal_error", message: "Failed to check vote status" });
  }
});

export default router;
