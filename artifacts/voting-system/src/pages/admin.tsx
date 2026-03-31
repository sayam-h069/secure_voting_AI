import { useGetFraudStats, useUpdateElection } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Settings, Power, ShieldAlert, Activity, ArrowRight } from "lucide-react";
import { FraudScoreBadge } from "./dashboard";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

export default function AdminPanel() {
  const { data: stats, isLoading } = useGetFraudStats();
  const updateElection = useUpdateElection();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const handleCloseElection = async (id: number) => {
    try {
      await updateElection.mutateAsync({
        id,
        data: { status: "closed" }
      });
      toast({ title: "Operation Terminated", description: `Election ${id} has been securely closed.` });
      queryClient.invalidateQueries(); // invalidate all to refresh stats and dashboard
    } catch(e: any) {
      toast({ title: "Action Failed", description: e.message, variant: "destructive" });
    }
  };

  // Prepare chart data
  const pieData = stats.alertsByType.map(item => ({
    name: item.type.replace('_', ' ').toUpperCase(),
    value: item.count
  }));
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight uppercase flex items-center">
          <Settings className="mr-3 h-8 w-8 text-primary" />
          System Administration
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">High-level diagnostics and overriding controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border rounded-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Global Alert Volume</div>
            <div className="text-4xl font-mono font-bold">{stats.totalAlerts}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border rounded-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Resolution Rate</div>
            <div className="text-4xl font-mono font-bold text-green-500">{stats.resolutionRate}%</div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/30 rounded-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-[10px] font-mono text-destructive uppercase tracking-widest mb-2">Critical Severity Count</div>
            <div className="text-4xl font-mono font-bold text-destructive">{stats.alertsBySeverity.critical}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Threat Distribution Chart */}
        <Card className="bg-card/50 border-border rounded-none">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="font-mono text-sm uppercase flex items-center">
              <Activity className="mr-2 h-4 w-4" /> Threat Vector Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'monospace', borderRadius: 0 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border">
                No threat data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Risky Elections */}
        <Card className="bg-card/50 border-border rounded-none">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="font-mono text-sm uppercase flex items-center text-destructive">
              <ShieldAlert className="mr-2 h-4 w-4" /> High-Risk Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {stats.topRiskyElections.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">No risky operations detected</div>
              ) : (
                stats.topRiskyElections.map(election => (
                  <div key={election.electionId} className="p-4 flex items-center justify-between bg-background/30 hover:bg-muted/20 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link href={`/elections/${election.electionId}`} className="font-mono font-bold hover:text-primary hover:underline">
                          {election.electionTitle}
                        </Link>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground mt-1">
                        Active Alerts: {election.alertCount}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Index</div>
                        <FraudScoreBadge score={election.fraudScore} />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCloseElection(election.electionId)}
                        disabled={updateElection.isPending}
                        className="font-mono text-xs uppercase rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Power className="mr-2 h-3 w-3" /> Force Terminate
                      </Button>
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