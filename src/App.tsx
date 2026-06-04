import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthBootGate from "@/components/AuthBootGate";
import Index from "./pages/Index.tsx";
import CustomerLogin from "./pages/CustomerLogin.tsx";
import DriverLogin from "./pages/DriverLogin.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import DriverDashboard from "./pages/DriverDashboard.tsx";
import BookingConfirmation from "./pages/BookingConfirmation.tsx";
import CustomerDashboard from "./pages/CustomerDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import About from "./pages/About.tsx";
import Terms from "./pages/Terms.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
          <AuthBootGate>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/index" element={<Index />} />
            <Route path="/login" element={<CustomerLogin />} />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/driver" element={<DriverLogin />} />
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracking"
              element={
                <ProtectedRoute requiredRole="customer">
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthBootGate>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
