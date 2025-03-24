import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import EnhancedLineBalancing2 from "@/pages/enhanced-line-balancing2";

function Router() {
  return (
    <Switch>
      {/* Route directly to the new EnhancedLineBalancing2 component */}
      <Route path="/" component={EnhancedLineBalancing2} />
      {/* Keep this route for compatibility */}
      <Route path="/line-balancing" component={EnhancedLineBalancing2} />
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
