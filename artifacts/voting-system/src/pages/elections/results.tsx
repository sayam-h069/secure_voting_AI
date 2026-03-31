import { useParams, Link } from "wouter";
import { useGetElectionResults, getGetElectionResultsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge, FraudScoreBadge } from "../dashboard";
import { ArrowLeft, Trophy, AlertTriangle, ShieldCheck, PieChart } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function ElectionResults() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: results, isLoading } = useGetElectionResults(id, {
    query: { enabled: !!id, queryKey: getGetElectionResultsQueryKey(id) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!results) return <div>Data unreadable.</div>;

  const { election, candidates, totalVotes, turnoutPercentage, fraudAlertCount, winner } = results;
  const isComplete = election.status === "closed";

  // Data for chart
  const chartData = candidates.map(c => ({
    name: c.name,
    votes: c.voteCount,
    percentage: c.percentage
  })).sort((a, b) => b.votes - a.votes);

  // Custom colors matching our theme variables roughly
  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#64748B'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center space-x-4 mb-4">
        <Link href={`/elections/${id}`}>
          <Button variant="ghost" size="icon" className="rounded-none border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-mono font-bold uppercase tracking-widest text-muted-foreground">Return to Dashboard</h1>
      </div>

      {/* Header Panel */}
      <div className="bg-card/50 border border-border p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <StatusBadge status={election.status} />
              <span className="font-mono text-xs text-muted-foreground tracking-widest">TELEMETRY_REPORT</span>
            </div>
            <h2 className="text-3xl font-mono font-bold tracking-tight text-primary uppercase">
              {election.title}
            </h2>
          </div>

          <div className="flex space-x-6 text-right">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Total Signals</div>
              <div className="font-mono text-3xl font-bold text-foreground">{totalVotes.toLocaleString()}</div>
            </div>
            <div className="border-l border-border pl-6">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Anomaly Events</div>
              <div className={`font-mono text-3xl font-bold ${fraudAlertCount > 0 ? 'text-destructive' : 'text-green-500'}`}>
                {fraudAlertCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Banner (if closed) */}
      {isComplete && winner && (
        <div className="bg-primary/10 border border-primary/30 p-6 flex items-center justify-between shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <div className="flex items-center space-x-6">
            <div className="p-4 bg-primary text-primary-foreground">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Primary Subject Confirmed</div>
              <div className="text-3xl font-mono font-bold text-foreground uppercase">{winner.name}</div>
              {winner.party && <div className="text-sm font-mono text-muted-foreground mt-1">{winner.party}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-primary">{winner.percentage.toFixed(1)}%</div>
            <div className="text-xs font-mono text-muted-foreground uppercase">{winner.voteCount.toLocaleString()} Votes</div>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      <Card className="bg-card/40 border-border rounded-none shadow-lg">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="font-mono text-lg uppercase tracking-widest flex items-center">
            <PieChart className="mr-2 h-5 w-5 text-primary" /> Distribution Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--foreground))', fontFamily: 'monospace', fontSize: 12 }} 
                  width={150}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 0,
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Security Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/40 border-border rounded-none">
          <CardContent className="p-6 flex items-start space-x-4">
            <div className="p-3 bg-muted">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-mono font-bold uppercase mb-1">Cryptographic Integrity</h3>
              <p className="text-sm font-mono text-muted-foreground">
                All registered signals have been verified via session signatures. Turnout metric implies {turnoutPercentage.toFixed(1)}% network participation relative to nominal baseline.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-card/40 border-border rounded-none ${election.fraudScore > 50 ? 'border-destructive/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : ''}`}>
          <CardContent className="p-6 flex items-start space-x-4">
            <div className={`p-3 ${election.fraudScore > 50 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-mono font-bold uppercase">AI Risk Index</h3>
                <FraudScoreBadge score={election.fraudScore} />
              </div>
              <p className="text-sm font-mono text-muted-foreground">
                {election.fraudScore > 70 
                  ? "CRITICAL: Anomalous patterns detected requiring immediate admin review." 
                  : election.fraudScore > 30 
                  ? "WARNING: Irregular signal timing detected."
                  : "NORMAL: No significant anomalies in telemetry."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}