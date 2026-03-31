import { db } from "@workspace/db";
import {
  electionsTable,
  candidatesTable,
  votesTable,
  fraudAlertsTable,
  activityLogTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding voting system data...");

  // Elections
  const [e1] = await db.insert(electionsTable).values({
    title: "2025 City Council General Election",
    description: "Vote for your city council representative in District 5",
    status: "active",
    startDate: new Date("2025-03-25"),
    endDate: new Date("2025-04-10"),
    totalVotes: 0,
    fraudScore: 12,
  }).returning();

  const [e2] = await db.insert(electionsTable).values({
    title: "Board of Education Election",
    description: "Elect members for the local school board",
    status: "active",
    startDate: new Date("2025-03-20"),
    endDate: new Date("2025-04-15"),
    totalVotes: 0,
    fraudScore: 67,
  }).returning();

  const [e3] = await db.insert(electionsTable).values({
    title: "Community Budget Referendum",
    description: "Vote on the proposed $4.2M community infrastructure budget",
    status: "closed",
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-03-01"),
    totalVotes: 0,
    fraudScore: 3,
  }).returning();

  const [e4] = await db.insert(electionsTable).values({
    title: "Mayoral Primary Election",
    description: "Nominate your preferred candidate for the upcoming mayoral race",
    status: "upcoming",
    startDate: new Date("2025-04-20"),
    endDate: new Date("2025-05-05"),
    totalVotes: 0,
    fraudScore: 0,
  }).returning();

  // Candidates for Election 1
  const [c1a] = await db.insert(candidatesTable).values({ electionId: e1.id, name: "Sandra Rivers", party: "Progressive Alliance", bio: "15-year community organizer and former school teacher" }).returning();
  const [c1b] = await db.insert(candidatesTable).values({ electionId: e1.id, name: "Marcus Chen", party: "Civic First", bio: "Local business owner and neighborhood watch coordinator" }).returning();
  const [c1c] = await db.insert(candidatesTable).values({ electionId: e1.id, name: "Patricia Okonkwo", party: "Independent", bio: "Environmental attorney with 20 years of public service" }).returning();

  // Candidates for Election 2
  const [c2a] = await db.insert(candidatesTable).values({ electionId: e2.id, name: "Dr. James Whitmore", party: "Education First", bio: "30 years as an educator and school principal" }).returning();
  const [c2b] = await db.insert(candidatesTable).values({ electionId: e2.id, name: "Aisha Muhammad", party: "Community Voice", bio: "Parent advocate and curriculum reform specialist" }).returning();

  // Candidates for Election 3
  const [c3a] = await db.insert(candidatesTable).values({ electionId: e3.id, name: "Yes — Approve Budget", party: "", bio: "Support the $4.2M infrastructure investment plan" }).returning();
  const [c3b] = await db.insert(candidatesTable).values({ electionId: e3.id, name: "No — Reject Budget", party: "", bio: "Oppose the current proposal and request revisions" }).returning();

  // Candidates for Election 4
  await db.insert(candidatesTable).values({ electionId: e4.id, name: "Governor Raymond Lau", party: "New Direction", bio: "Former state governor with infrastructure experience" }).returning();
  await db.insert(candidatesTable).values({ electionId: e4.id, name: "Council Chair Diana Park", party: "People's Coalition", bio: "12-year city council chair focused on affordable housing" }).returning();
  await db.insert(candidatesTable).values({ electionId: e4.id, name: "Dr. Felix Aguilar", party: "Independent", bio: "Professor of public policy and urban planning" }).returning();

  // Cast some votes
  const voterIds1 = ["voter_001", "voter_002", "voter_003", "voter_004", "voter_005"];
  const voterIds2 = ["voter_006", "voter_007", "voter_008", "voter_009"];
  const voterIds3 = ["voter_010", "voter_011", "voter_012", "voter_013", "voter_014", "voter_015", "voter_016"];

  for (let i = 0; i < 3; i++) {
    await db.insert(votesTable).values({ electionId: e1.id, candidateId: c1a.id, voterId: voterIds1[i], voterIp: `192.168.1.${10 + i}` });
    await db.update(candidatesTable).set({ voteCount: i + 1 }).where(db._).where;
  }
  await db.insert(votesTable).values({ electionId: e1.id, candidateId: c1b.id, voterId: voterIds1[3], voterIp: "192.168.1.20" });
  await db.insert(votesTable).values({ electionId: e1.id, candidateId: c1c.id, voterId: voterIds1[4], voterIp: "192.168.1.21" });

  await db.update(candidatesTable).set({ voteCount: 3 }).where(() => ({ id: c1a.id }));
  await db.update(candidatesTable).set({ voteCount: 1 }).where(() => ({ id: c1b.id }));
  await db.update(candidatesTable).set({ voteCount: 1 }).where(() => ({ id: c1c.id }));
  await db.update(electionsTable).set({ totalVotes: 5 }).where(() => ({ id: e1.id }));

  for (let i = 0; i < 3; i++) {
    await db.insert(votesTable).values({ electionId: e2.id, candidateId: c2a.id, voterId: voterIds2[i], voterIp: `10.0.0.${i + 1}` });
  }
  await db.insert(votesTable).values({ electionId: e2.id, candidateId: c2b.id, voterId: voterIds2[3], voterIp: "10.0.0.4" });
  await db.update(candidatesTable).set({ voteCount: 3 }).where(() => ({ id: c2a.id }));
  await db.update(candidatesTable).set({ voteCount: 1 }).where(() => ({ id: c2b.id }));
  await db.update(electionsTable).set({ totalVotes: 4 }).where(() => ({ id: e2.id }));

  for (let i = 0; i < 5; i++) {
    await db.insert(votesTable).values({ electionId: e3.id, candidateId: c3a.id, voterId: voterIds3[i], voterIp: `172.16.0.${i + 1}` });
  }
  await db.insert(votesTable).values({ electionId: e3.id, candidateId: c3b.id, voterId: voterIds3[5], voterIp: "172.16.0.6" });
  await db.insert(votesTable).values({ electionId: e3.id, candidateId: c3b.id, voterId: voterIds3[6], voterIp: "172.16.0.7" });
  await db.update(candidatesTable).set({ voteCount: 5 }).where(() => ({ id: c3a.id }));
  await db.update(candidatesTable).set({ voteCount: 2 }).where(() => ({ id: c3b.id }));
  await db.update(electionsTable).set({ totalVotes: 7 }).where(() => ({ id: e3.id }));

  // Fraud alerts
  await db.insert(fraudAlertsTable).values({
    electionId: e2.id,
    type: "duplicate_ip",
    severity: "high",
    description: "IP 10.0.0.3 used to vote 3 times in the Board of Education Election",
    affectedVotes: 3,
    voterIp: "10.0.0.3",
  });

  await db.insert(fraudAlertsTable).values({
    electionId: e2.id,
    type: "rapid_voting",
    severity: "critical",
    description: "8 votes cast within 45 seconds — possible automated bot activity detected",
    affectedVotes: 8,
    voterId: "voter_bot_suspect",
    voterIp: "10.0.1.100",
  });

  await db.insert(fraudAlertsTable).values({
    electionId: e2.id,
    type: "unusual_pattern",
    severity: "medium",
    description: "Unusual voting pattern: 40% of votes cast between 2am and 4am",
    affectedVotes: 12,
  });

  await db.insert(fraudAlertsTable).values({
    electionId: e1.id,
    type: "suspicious_timing",
    severity: "low",
    description: "Minor spike in voting activity observed at 3:17am UTC",
    affectedVotes: 2,
  });

  const resolved = await db.insert(fraudAlertsTable).values({
    electionId: e3.id,
    type: "duplicate_ip",
    severity: "high",
    description: "Two votes from same IP in Community Budget Referendum — investigated and confirmed as household members",
    affectedVotes: 2,
    voterIp: "172.16.0.6",
    resolved: true,
    resolvedAt: new Date("2025-03-02"),
    resolution: "Confirmed legitimate — two registered voters in same household using shared IP",
  });

  // Activity log
  await db.insert(activityLogTable).values([
    { type: "election_started", description: `Election created: 2025 City Council General Election`, electionId: e1.id, electionTitle: e1.title, severity: "info", timestamp: new Date("2025-03-25") },
    { type: "election_started", description: `Election created: Board of Education Election`, electionId: e2.id, electionTitle: e2.title, severity: "info", timestamp: new Date("2025-03-20") },
    { type: "election_closed", description: `Election closed: Community Budget Referendum`, electionId: e3.id, electionTitle: e3.title, severity: "info", timestamp: new Date("2025-03-01") },
    { type: "fraud_detected", description: `Duplicate IP fraud detected in "Board of Education Election"`, electionId: e2.id, electionTitle: e2.title, severity: "danger", timestamp: new Date("2025-03-22") },
    { type: "fraud_detected", description: `Bot behavior detected in "Board of Education Election"`, electionId: e2.id, electionTitle: e2.title, severity: "danger", timestamp: new Date("2025-03-23") },
    { type: "alert_resolved", description: `Fraud alert resolved in "Community Budget Referendum"`, electionId: e3.id, electionTitle: e3.title, severity: "info", timestamp: new Date("2025-03-02") },
    { type: "vote_cast", description: `Vote cast in "2025 City Council General Election"`, electionId: e1.id, electionTitle: e1.title, severity: "info", timestamp: new Date() },
    { type: "vote_cast", description: `Vote cast in "Board of Education Election"`, electionId: e2.id, electionTitle: e2.title, severity: "info", timestamp: new Date() },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
