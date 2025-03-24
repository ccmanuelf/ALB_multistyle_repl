import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import EnhancedLineBalancing3 from "@/pages/enhanced-line-balancing3";

function Router() {
  return (
    <Switch>
      {/* Route directly to the new EnhancedLineBalancing3 component */}
      <Route path="/" component={EnhancedLineBalancing3} />
      {/* Keep this route for compatibility */}
      <Route path="/line-balancing" component={EnhancedLineBalancing3} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
