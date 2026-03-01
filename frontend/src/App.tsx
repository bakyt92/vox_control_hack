import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Agents from "./pages/Agents";
import LiveDemo from "./pages/LiveDemo";
import Analytics from "./pages/Analytics";
import Knowledge from "./pages/Knowledge";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Agents />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/knowledge" element={<Knowledge />} />
          </Route>

          {/* Routes without sidebar (full page) */}
          <Route path="/editor/new" element={<Index />} />
          <Route path="/editor/:agentId" element={<Index />} />
          <Route path="/demo/:agentId" element={<LiveDemo />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
