import { useParams, Link } from "wouter";
import { 
  useGetElection, 
  getGetElectionQueryKey,
  useCastVote, 
  useCheckVoteStatus,
  getCheckVoteStatusQueryKey,
  useAnalyzeElectionFraud
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getVoterId } from "@/lib/voter-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, FraudScoreBadge } from "../dashboard";
import { format } from "date-fns";
import { ShieldAlert, Vote, BarChart, UserCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ElectionDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const voterId = getVoterId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  const { data: election, isLoading } = useGetElection(id, { 
    query: { enabled: !!id, queryKey: getGetElectionQueryKey(id) } 
  });
  
  const { data: voteStatus, isLoading: loadingVoteStatus } = useCheckVoteStatus({ electionId: id, voterId }, {
    query: { enabled: !!id && !!voterId, queryKey: getCheckVoteStatusQueryKey({ electionId: id, voterId }) }
  });

  const castVote = useCastVote();
  const analyzeFraud = useAnalyzeElectionFraud();

  if (isLoading || loadingVoteStatus) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!election) return <div>Operation not found.</div>;

  const isActive = election.status === "active";
  const hasVoted = voteStatus?.hasVoted;

  const handleVote = async () => {
    if (!selectedCandidate) return;
    
    try {
      const response = await castVote.mutateAsync({
        data: {
          electionId: id,
          candidateId: selectedCandidate,
          voterId: voterId
        }
      });
      
      if (response.fraudFlag) {
        toast({
          title: "Anomaly Detected",
          description: "Your vote was recorded but flagged for security review.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Vote Recorded",
          description: "Secure cryptographic ballot submitted successfully.",
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: getGetElectionQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getCheckVoteStatusQueryKey({ electionId: id, voterId }) });
      
    } catch (error: any) {
      toast({
        title: "Transmission Failed",
        description: error.message || "System rejected the ballot.",
        variant: "destructive"
      });
    }
  };

  const handleAnalyze = async () => {
    try {
      toast({
        title: "Analysis Initiated",
        description: "AI subsystem scanning for anomalies...",
      });
      
      const result = await analyzeFraud.mutateAsync({ electionId: id });
      
      toast({
        title: "Analysis Complete",
        description: `Risk Level: ${result.riskLevel}. Found ${result.findings.length} anomalies.`,
        variant: result.riskLevel === 'high' || result.riskLevel === 'critical' ? 'destructive' : 'default'
      });
      
      queryClient.invalidateQueries({ queryKey: getGetElectionQueryKey(id) });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: "Security subsystem error.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Panel */}
      <div className="bg-card/50 border border-border p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <DatabaseIcon className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <StatusBadge status={election.status} />
                <span className="font-mono text-xs text-muted-foreground tracking-widest">OP_ID: {election.id.toString().padStart(8, '0')}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-primary uppercase">
                {election.title}
              </h1>
              <p className="text-muted-foreground font-mono max-w-2xl">
                {election.description || "No operational briefing provided."}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Link href={`/elections/${id}/results`}>
                <Button variant="outline" className="font-mono uppercase rounded-none border-border">
                  <BarChart className="mr-2 h-4 w-4" /> View Telemetry
                </Button>
              </Link>
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeFraud.isPending}
                variant={election.fraudScore > 50 ? "destructive" : "secondary"}
                className="font-mono uppercase rounded-none"
              >
                {analyzeFraud.isPending ? (
                  <span className="animate-pulse">Scanning...</span>
                ) : (
                  <><ShieldAlert className="mr-2 h-4 w-4" /> Run AI Audit</>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Commencement</div>
              <div className="font-mono text-sm">{format(new Date(election.startDate), 'yyyy-MM-dd HH:mm')}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Termination</div>
              <div className="font-mono text-sm">{format(new Date(election.endDate), 'yyyy-MM-dd HH:mm')}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Total Packets (Votes)</div>
              <div className="font-mono text-sm font-bold text-primary">{election.totalVotes.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">System Risk Index</div>
              <div className="flex items-center space-x-2">
                <FraudScoreBadge score={election.fraudScore} />
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${election.fraudScore > 70 ? 'bg-destructive' : election.fraudScore > 30 ? 'bg-amber-500' : 'bg-green-500'}`} 
                    style={{ width: `${election.fraudScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Candidates Roster */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="font-mono text-lg font-bold uppercase tracking-widest text-foreground flex items-center border-b border-border pb-2">
            <UserCircle2 className="mr-2 h-5 w-5 text-primary" /> Subject Roster
          </h2>
          
          <div className="space-y-3">
            {election.candidates.map((candidate) => {
              const isSelected = selectedCandidate === candidate.id;
              
              return (
                <Card 
                  key={candidate.id} 
                  className={`bg-card/40 border transition-all rounded-none overflow-hidden ${
                    isSelected ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-border hover:border-primary/50'
                  } ${isActive && !hasVoted ? 'cursor-pointer' : ''}`}
                  onClick={() => isActive && !hasVoted && setSelectedCandidate(candidate.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row h-full">
                      <div className="flex-1 p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-mono text-xl font-bold text-foreground">{candidate.name}</h3>
                            {candidate.party && (
                              <Badge className="mt-1 font-mono text-[10px] uppercase rounded-none bg-muted text-muted-foreground border-border">
                                {candidate.party}
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <div className="bg-primary text-primary-foreground px-2 py-1 text-[10px] font-mono uppercase font-bold">
                              Selected Subject
                            </div>
                          )}
                        </div>
                        
                        {candidate.bio && (
                          <p className="text-sm font-mono text-muted-foreground line-clamp-2">
                            {candidate.bio}
                          </p>
                        )}
                        
                        <div className="pt-2">
                          <div className="flex justify-between font-mono text-xs mb-1">
                            <span className="text-muted-foreground">Share of total</span>
                            <span className="font-bold">{candidate.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={candidate.percentage} className="h-1.5 rounded-none" />
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 border-t sm:border-t-0 sm:border-l border-border p-5 flex flex-col justify-center items-center min-w-[140px]">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Registered Votes</div>
                        <div className="font-mono text-3xl font-bold text-foreground">
                          {candidate.voteCount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Voting Interface */}
        <div className="space-y-6">
          <Card className="bg-card/50 border-border rounded-none shadow-lg sticky top-6">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="font-mono text-lg uppercase tracking-widest flex items-center text-primary">
                <Vote className="mr-2 h-5 w-5" /> Voting Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">Current Session ID (Voter)</div>
                <div className="font-mono font-bold bg-muted p-2 text-center tracking-widest border border-border">
                  {voterId}
                </div>
              </div>

              {hasVoted ? (
                <div className="p-6 bg-green-500/10 border border-green-500/30 text-center space-y-3">
                  <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="font-mono font-bold text-green-500 uppercase">Ballot Registered</h3>
                  <p className="text-xs font-mono text-green-500/80">Your cryptographic signature has been verified and recorded for this operation.</p>
                </div>
              ) : !isActive ? (
                <div className="p-6 bg-orange-500/10 border border-orange-500/30 text-center space-y-3">
                  <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
                  <h3 className="font-mono font-bold text-orange-500 uppercase">Operation {election.status}</h3>
                  <p className="text-xs font-mono text-orange-500/80">The voting gateway is currently locked. Transmissions are rejected.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedCandidate ? (
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-muted-foreground uppercase text-center">Selected Target</div>
                      <div className="font-mono font-bold text-lg text-center p-3 border border-primary bg-primary/10 text-primary">
                        {election.candidates.find(c => c.id === selectedCandidate)?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed border-border text-muted-foreground font-mono text-sm">
                      Select a subject from the roster to prepare ballot.
                    </div>
                  )}

                  <Button 
                    className="w-full font-mono uppercase tracking-widest h-14 rounded-none text-lg"
                    disabled={!selectedCandidate || castVote.isPending}
                    onClick={handleVote}
                  >
                    {castVote.isPending ? "Transmitting..." : "Transmit Ballot"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</span>;
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
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}