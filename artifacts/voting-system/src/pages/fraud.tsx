import { useState } from "react";
import { useListFraudAlerts, getListFraudAlertsQueryKey, useResolveFraudAlert } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, CheckCircle2, AlertTriangle, Crosshair, Clock, Network, Bot, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { FraudAlert, ListFraudAlertsSeverity } from "@workspace/api-client-react";

export default function FraudAlerts() {
  const [filterResolved, setFilterResolved] = useState<boolean | undefined>(false);
  const { data: alerts, isLoading } = useListFraudAlerts({ resolved: filterResolved });
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight uppercase text-destructive flex items-center">
            <ShieldAlert className="mr-3 h-8 w-8" />
            Security Subsystem
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Review and resolve anomalous network behavior</p>
        </div>
        
        <div className="flex bg-muted p-1 border border-border">
          <button 
            className={`px-4 py-1.5 font-mono text-xs uppercase transition-colors ${filterResolved === false ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setFilterResolved(false)}
          >
            Active Threats
          </button>
          <button 
            className={`px-4 py-1.5 font-mono text-xs uppercase transition-colors ${filterResolved === undefined ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setFilterResolved(undefined)}
          >
            All Logs
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : alerts?.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border bg-card/20">
            <ShieldCheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4 opacity-50" />
            <h3 className="font-mono text-lg font-medium text-foreground uppercase">System Secure</h3>
            <p className="font-mono text-sm text-muted-foreground mt-1">No anomalous patterns matching current filters.</p>
          </div>
        ) : (
          alerts?.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: FraudAlert }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const resolveAlert = useResolveFraudAlert();
  
  const [resolutionText, setResolutionText] = useState("");
  const [removeVotes, setRemoveVotes] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'critical': return 'text-red-500 border-red-500/30 bg-red-500/10';
      case 'high': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
      case 'low': return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
      default: return 'text-muted-foreground border-border bg-muted/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'duplicate_ip': return <Network className="h-5 w-5" />;
      case 'bot_behavior': return <Bot className="h-5 w-5" />;
      case 'rapid_voting': return <Clock className="h-5 w-5" />;
      case 'coordinated_attack': return <Users className="h-5 w-5" />;
      default: return <Crosshair className="h-5 w-5" />;
    }
  };

  const handleResolve = async () => {
    if (!resolutionText) {
      toast({ title: "Error", description: "Resolution notes required.", variant: "destructive" });
      return;
    }

    try {
      await resolveAlert.mutateAsync({
        id: alert.id,
        data: {
          resolution: resolutionText,
          removeVotes
        }
      });
      
      toast({ title: "Threat Resolved", description: `Alert ${alert.id} marked as closed.` });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getListFraudAlertsQueryKey() });
    } catch(e: any) {
      toast({ title: "Resolution Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className={`border rounded-none transition-all ${alert.resolved ? 'bg-muted/10 border-border opacity-70' : 'bg-card/60 shadow-lg border-l-4 ' + getSeverityColor(alert.severity).split(' ')[0].replace('text-', 'border-')}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          
          <div className="flex-1 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-none ${getSeverityColor(alert.severity)}`}>
                    {alert.severity} PRIORITY
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground tracking-widest">
                    ID: {alert.id.toString().padStart(6, '0')}
                  </span>
                  {alert.resolved && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase rounded-none border-green-500/30 text-green-500 bg-green-500/10">
                      RESOLVED
                    </Badge>
                  )}
                </div>
                <h3 className="font-mono text-lg font-bold text-foreground uppercase tracking-tight flex items-center mt-2">
                  <span className={`mr-2 ${getSeverityColor(alert.severity).split(' ')[0]}`}>
                    {getTypeIcon(alert.type)}
                  </span>
                  {alert.type.replace('_', ' ')}
                </h3>
              </div>
            </div>

            <p className="text-sm font-mono text-muted-foreground border-l-2 border-border pl-3">
              {alert.description}
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground pt-2">
              <div className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {format(new Date(alert.createdAt), 'MMM dd HH:mm:ss')}</div>
              <div>OP: {alert.electionTitle || alert.electionId}</div>
              {alert.voterIp && <div>IP: {alert.voterIp}</div>}
              {alert.voterId && <div className="truncate max-w-[150px]">UID: {alert.voterId}</div>}
            </div>

            {alert.resolved && alert.resolution && (
              <div className="bg-background/50 border border-border p-3 mt-4 text-xs font-mono">
                <span className="text-green-500 font-bold uppercase mr-2">Action Taken:</span> 
                <span className="text-muted-foreground">{alert.resolution}</span>
              </div>
            )}
          </div>

          <div className={`p-5 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border min-w-[200px] ${alert.resolved ? 'bg-background/20' : 'bg-background/50'}`}>
            <div className="text-center mb-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Impacted Signals</div>
              <div className={`font-mono text-3xl font-bold ${alert.resolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                {alert.affectedVotes}
              </div>
            </div>

            {!alert.resolved && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full font-mono uppercase text-xs border-primary text-primary hover:bg-primary/20 rounded-none">
                    Take Action
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border rounded-none font-mono">
                  <DialogHeader>
                    <DialogTitle className="text-xl uppercase flex items-center text-primary">
                      <ShieldCheckIcon className="mr-2 h-5 w-5" /> Resolve Anomaly
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Provide action log for ID:{alert.id}. This will be permanently recorded in the audit trail.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Analyst Notes</Label>
                      <Textarea 
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="e.g. Verified IP origin as benign NAT gateway. Cleared flags."
                        className="bg-background rounded-none border-border resize-none"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border bg-background/50">
                      <div className="space-y-0.5">
                        <Label className="text-sm uppercase font-bold text-destructive">Quarantine Signals</Label>
                        <p className="text-[10px] text-muted-foreground">Purge {alert.affectedVotes} affected votes from telemetry.</p>
                      </div>
                      <Switch 
                        checked={removeVotes}
                        onCheckedChange={setRemoveVotes}
                        className="data-[state=checked]:bg-destructive"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none font-mono uppercase">Cancel</Button>
                    <Button onClick={handleResolve} disabled={resolveAlert.isPending} className="rounded-none font-mono uppercase bg-primary text-primary-foreground">
                      {resolveAlert.isPending ? "Committing..." : "Commit Action"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
  );
}