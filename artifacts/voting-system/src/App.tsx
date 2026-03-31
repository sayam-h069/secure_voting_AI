import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Elections from "@/pages/elections/index";
import CreateElection from "@/pages/elections/new";
import ElectionDetail from "@/pages/elections/detail";
import ElectionResults from "@/pages/elections/results";
import FraudAlerts from "@/pages/fraud";
import AdminPanel from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  }
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/elections" component={Elections} />
        <Route path="/elections/new" component={CreateElection} />
        <Route path="/elections/:id" component={ElectionDetail} />
        <Route path="/elections/:id/results" component={ElectionResults} />
        <Route path="/fraud" component={FraudAlerts} />
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
