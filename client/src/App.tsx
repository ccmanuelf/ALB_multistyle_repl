import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import EnhancedLineBalancing3 from "@/pages/enhanced-line-balancing3";
import EnhancedLineBalancingMultiStyle from "@/pages/enhanced-line-balancing-multi-style";
import Navigation from "@/components/navigation";

function Router() {
  return (
    <Switch>
      {/* Route directly to the new EnhancedLineBalancing3 component */}
      <Route path="/" component={EnhancedLineBalancing3} />
      {/* Keep this route for compatibility */}
      <Route path="/line-balancing" component={EnhancedLineBalancing3} />
      {/* Add multi-style line balancing route */}
      <Route path="/multi-style" component={EnhancedLineBalancingMultiStyle} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto">
          <Router />
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
