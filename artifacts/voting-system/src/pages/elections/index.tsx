import { useState } from "react";
import { useListElections } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, FraudScoreBadge } from "../dashboard";
import { format } from "date-fns";
import { Search, Plus, Filter, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListElectionsStatus } from "@workspace/api-client-react";

export default function Elections() {
  const [statusFilter, setStatusFilter] = useState<ListElectionsStatus | "all">("all");
  const [search, setSearch] = useState("");
  
  const { data: elections, isLoading } = useListElections(
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const filteredElections = elections?.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight uppercase">Operations Registry</h1>
          <p className="text-muted-foreground font-mono text-sm">Manage and monitor all democratic processes</p>
        </div>
        
        <Link href="/elections/new">
          <Button className="font-mono uppercase rounded-none border border-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Initialize Election
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card/50 p-4 border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search registry by title or description..." 
            className="pl-9 font-mono rounded-none border-border bg-background focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={statusFilter} 
            onValueChange={(val) => setStatusFilter(val as any)}
          >
            <SelectTrigger className="font-mono rounded-none border-border bg-background">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-border">
              <SelectItem value="all" className="font-mono">ALL STATUSES</SelectItem>
              <SelectItem value="active" className="font-mono text-green-500">ACTIVE</SelectItem>
              <SelectItem value="upcoming" className="font-mono text-blue-500">UPCOMING</SelectItem>
              <SelectItem value="closed" className="font-mono text-orange-500">CLOSED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : filteredElections?.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border bg-card/20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <DatabaseIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-mono text-lg font-medium text-foreground">No operations found</h3>
            <p className="font-mono text-sm text-muted-foreground mt-1">Try adjusting your filters or initialize a new election.</p>
          </div>
        ) : (
          filteredElections?.map(election => (
            <Link key={election.id} href={`/elections/${election.id}`}>
              <Card className="bg-card/40 border-border hover:bg-muted/20 hover:border-primary/50 transition-all cursor-pointer group rounded-none">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                          {election.title}
                        </h3>
                        <StatusBadge status={election.status} />
                        {election.fraudScore > 70 && (
                          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm font-mono text-muted-foreground line-clamp-1">
                        {election.description || "No description provided."}
                      </p>
                      <div className="text-xs font-mono text-muted-foreground flex items-center space-x-4">
                        <span>ID: {election.id.toString().padStart(6, '0')}</span>
                        <span>START: {format(new Date(election.startDate), 'yyyy-MM-dd HH:mm')}</span>
                        <span>END: {format(new Date(election.endDate), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8 md:border-l border-border md:pl-8">
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Total Votes</div>
                        <div className="font-mono text-2xl font-bold text-foreground">
                          {election.totalVotes.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Risk Index</div>
                        <div className="text-xl">
                          <FraudScoreBadge score={election.fraudScore} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
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