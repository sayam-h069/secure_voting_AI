import { useGetDashboardSummary, useGetRecentActivity, useGetFraudStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, ShieldAlert, Vote, Activity, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({ limit: 10 });
  const { data: fraudStats, isLoading: loadingStats } = useGetFraudStats();

  if (loadingSummary || loadingActivity || loadingStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!summary || !activity || !fraudStats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground uppercase mb-1">Command Center</h1>
        <p className="text-muted-foreground font-mono text-sm">System metrics and live monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Active Elections" 
          value={summary.activeElections.toString()} 
          total={summary.totalElections.toString()}
          icon={Activity}
          trend="Live"
        />
        <MetricCard 
          title="Total Votes Cast" 
          value={summary.totalVotesCast.toLocaleString()} 
          icon={Vote}
          trend="+14% this hour"
        />
        <MetricCard 
          title="Open Fraud Alerts" 
          value={summary.fraudAlertsOpen.toString()} 
          icon={AlertCircle}
          trend="Requires Action"
          intent={summary.fraudAlertsOpen > 0 ? "danger" : "normal"}
        />
        <MetricCard 
          title="System Security" 
          value={`${fraudStats.resolutionRate}%`} 
          subtitle="Resolution Rate"
          icon={ShieldCheck}
          intent="success"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 bg-card/50 border-border shadow-lg">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-mono text-lg uppercase flex items-center">
              <DatabaseIcon className="mr-2 h-4 w-4 text-primary" />
              Active Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {summary.recentElections.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">No recent elections</div>
              ) : (
                summary.recentElections.map(election => (
                  <Link key={election.id} href={`/elections/${election.id}`}>
                    <div className="p-4 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-semibold text-foreground">{election.title}</span>
                          <StatusBadge status={election.status} />
                        </div>
                        <div className="text-xs font-mono text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(election.startDate), 'MMM dd, yyyy')} - {format(new Date(election.endDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <div className="text-xs font-mono text-muted-foreground uppercase">Votes</div>
                          <div className="font-mono font-bold">{election.totalVotes.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-muted-foreground uppercase">Risk Score</div>
                          <FraudScoreBadge score={election.fraudScore} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border shadow-lg">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-mono text-lg uppercase flex items-center">
              <Activity className="mr-2 h-4 w-4 text-primary" />
              Live Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 h-[400px] overflow-y-auto">
              {activity.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">No recent activity</div>
              ) : (
                activity.map(item => (
                  <div key={item.id} className="p-4 flex space-x-3 text-sm">
                    <div className="mt-0.5">
                      {item.type === 'vote_cast' && <Vote className="h-4 w-4 text-blue-500" />}
                      {item.type === 'fraud_detected' && <ShieldAlert className="h-4 w-4 text-red-500" />}
                      {item.type === 'election_started' && <Activity className="h-4 w-4 text-green-500" />}
                      {item.type === 'election_closed' && <CheckCircle2 className="h-4 w-4 text-orange-500" />}
                      {item.type === 'alert_resolved' && <ShieldCheck className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-mono text-foreground leading-tight">{item.description}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {format(new Date(item.timestamp), 'HH:mm:ss · MMM dd')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  total,
  subtitle,
  icon: Icon, 
  trend,
  intent = "normal" 
}: { 
  title: string; 
  value: string; 
  total?: string;
  subtitle?: string;
  icon: any; 
  trend?: string;
  intent?: "normal" | "danger" | "success";
}) {
  const valueColor = intent === "danger" ? "text-destructive" : intent === "success" ? "text-green-500" : "text-primary";
  
  return (
    <Card className="bg-card/50 border-border shadow-md overflow-hidden relative group">
      <div className={`absolute top-0 left-0 w-1 h-full ${intent === 'danger' ? 'bg-destructive' : intent === 'success' ? 'bg-green-500' : 'bg-primary'}`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline space-x-1">
              <span className={`text-4xl font-mono font-bold tracking-tighter ${valueColor}`}>
                {value}
              </span>
              {total && <span className="text-lg font-mono text-muted-foreground">/ {total}</span>}
            </div>
            {(trend || subtitle) && (
              <p className="text-xs font-mono text-muted-foreground mt-2 flex items-center">
                {trend && <span className={intent === 'danger' ? 'text-destructive' : 'text-primary'}>{trend}</span>}
                {subtitle && <span>{subtitle}</span>}
              </p>
            )}
          </div>
          <div className={`p-3 bg-muted rounded-none border border-border ${intent === 'danger' ? 'text-destructive' : 'text-primary'}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    closed: "bg-orange-500/10 text-orange-500 border-orange-500/20"
  };
  
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-none border ${variants[status] || variants.upcoming}`}>
      {status}
    </Badge>
  );
}

export function FraudScoreBadge({ score }: { score: number }) {
  let colorClass = "text-green-500";
  if (score >= 70) colorClass = "text-red-500";
  else if (score >= 30) colorClass = "text-amber-500";
  
  return (
    <div className={`font-mono font-bold ${colorClass}`}>
      {score.toFixed(1)}
    </div>
  );
}

function DatabaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
