import { Outlet, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "./AdminSidebar";
import { ThemeToggle } from "./ThemeToggle";

const titles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/trips": "Trip Management",
  "/admin/drivers": "Driver Management",
  "/admin/customers": "User Management",
};

const AdminLayout = () => {
  const { signOut, user } = useAuth();
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b px-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1
                className="text-base font-bold leading-none truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {title}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
