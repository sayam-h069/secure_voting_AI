import { useState } from "react";
import { useCreateElection, getListElectionsQueryKey, useAddCandidate } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  candidates: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    party: z.string().optional(),
    bio: z.string().optional()
  })).min(2, "At least 2 candidates are required")
});

export default function CreateElection() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createElection = useCreateElection();
  const addCandidate = useAddCandidate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"), // 7 days from now
      candidates: [
        { name: "", party: "", bio: "" },
        { name: "", party: "", bio: "" }
      ]
    }
  });

  const candidates = form.watch("candidates");

  const appendCandidate = () => {
    const current = form.getValues("candidates");
    form.setValue("candidates", [...current, { name: "", party: "", bio: "" }]);
  };

  const removeCandidate = (index: number) => {
    const current = form.getValues("candidates");
    if (current.length <= 2) {
      toast({
        title: "Error",
        description: "An election requires at least two candidates.",
        variant: "destructive"
      });
      return;
    }
    form.setValue("candidates", current.filter((_, i) => i !== index));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // 1. Create Election
      const election = await createElection.mutateAsync({
        data: {
          title: values.title,
          description: values.description,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString()
        }
      });

      // 2. Add Candidates
      for (const candidate of values.candidates) {
        await addCandidate.mutateAsync({
          id: election.id,
          data: {
            name: candidate.name,
            party: candidate.party,
            bio: candidate.bio
          }
        });
      }

      // 3. Success
      queryClient.invalidateQueries({ queryKey: getListElectionsQueryKey() });
      toast({
        title: "Election Initialized",
        description: `Successfully created ${election.title} with ${values.candidates.length} candidates.`,
      });
      
      setLocation(`/elections/${election.id}`);
    } catch (error: any) {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to create election.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight uppercase text-primary">Initialize Operation</h1>
        <p className="text-muted-foreground font-mono text-sm">Configure parameters for a new democratic process</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card/50 border-border rounded-none shadow-lg">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="font-mono text-lg uppercase tracking-widest">Core Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Operation Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2024 General Election" className="font-mono rounded-none bg-background/50 text-lg" {...field} />
                    </FormControl>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Briefing / Context</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide operational context..." 
                        className="font-mono rounded-none bg-background/50 resize-none min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Commencement (UTC)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" className="font-mono rounded-none bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Termination (UTC)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" className="font-mono rounded-none bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border rounded-none shadow-lg">
            <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-lg uppercase tracking-widest">Subject Roster</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={appendCandidate} className="font-mono uppercase text-xs rounded-none border-primary text-primary hover:bg-primary/20">
                <Plus className="h-3 w-3 mr-2" /> Add Subject
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {candidates.map((_, index) => (
                  <div key={index} className="p-6 relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted group-hover:bg-primary transition-colors" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="font-mono text-sm font-bold text-muted-foreground">SUBJECT_0{index + 1}</div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none"
                        onClick={() => removeCandidate(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`candidates.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-[10px] uppercase text-muted-foreground">Identifier / Name</FormLabel>
                            <FormControl>
                              <Input className="font-mono rounded-none bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage className="font-mono text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`candidates.${index}.party`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-[10px] uppercase text-muted-foreground">Affiliation</FormLabel>
                            <FormControl>
                              <Input className="font-mono rounded-none bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage className="font-mono text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`candidates.${index}.bio`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="font-mono text-[10px] uppercase text-muted-foreground">Dossier / Bio</FormLabel>
                            <FormControl>
                              <Input className="font-mono rounded-none bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage className="font-mono text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg"
              disabled={createElection.isPending || addCandidate.isPending}
              className="font-mono uppercase tracking-widest rounded-none min-w-[200px]"
            >
              {createElection.isPending || addCandidate.isPending ? (
                "Processing..."
              ) : (
                <>Execute Registration <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}