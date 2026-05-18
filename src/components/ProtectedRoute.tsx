import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requiredRole?: "customer" | "driver" | "admin";
}

const roleHome = (role: string | null) => {
  if (role === "driver") return "/driver";
  if (role === "admin") return "/admin";
  return "/dashboard";
};

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={requiredRole === "driver" ? "/driver/login" : "/login"} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
