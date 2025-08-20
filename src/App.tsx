import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PatientListPage from "./pages/patients/PatientListPage";
import PatientFormPage from "./pages/patients/PatientFormPage";
import EditorLaudoPage from "./pages/laudos/EditorLaudoPage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/patients" element={<PatientListPage />} />
                  <Route path="/patients/new" element={<PatientFormPage />} />
                  <Route path="/patients/:id/edit" element={<PatientFormPage />} />
                  <Route path="/laudos/editor" element={<EditorLaudoPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
