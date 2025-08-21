import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import PatientListPage from "./pages/patients/PatientListPage";
import PatientFormPage from "./pages/patients/PatientFormPage";
import EditorLaudoPage from "./pages/laudos/EditorLaudoPage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route 
                              path="/patients" 
                              element={
                                <ProtectedRoute requiredRoles={['admin', 'medico', 'secretaria', 'gestao']}>
                                  <PatientListPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/patients/new" 
                              element={
                                <ProtectedRoute requiredRoles={['admin', 'medico', 'secretaria']}>
                                  <PatientFormPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/patients/:id/edit" 
                              element={
                                <ProtectedRoute requiredRoles={['admin', 'medico', 'secretaria']}>
                                  <PatientFormPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/laudos/editor" 
                              element={
                                <ProtectedRoute requiredRoles={['admin', 'medico']}>
                                  <EditorLaudoPage />
                                </ProtectedRoute>
                              } 
                            />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </SidebarProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </HelmetProvider>
);

export default App;
