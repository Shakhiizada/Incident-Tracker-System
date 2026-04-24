import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, LayoutDashboard, AlertTriangle, FileText, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userRoleLabels } from "@/lib/labels";
import { UserRole } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      },
    });
  };

  if (!user) return <>{children}</>;

  const isAuditVisible = user.role === UserRole.admin || user.role === UserRole.analyst;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">SecureTracker</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavButton href="/" icon={<LayoutDashboard className="w-4 h-4" />} label="Дашборд" active={location === "/"} />
              <NavButton href="/incidents" icon={<AlertTriangle className="w-4 h-4" />} label="Инциденты" active={location.startsWith("/incidents")} />
              {isAuditVisible && (
                <NavButton href="/audit" icon={<FileText className="w-4 h-4" />} label="Журнал аудита" active={location === "/audit"} />
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium leading-none">{user.name}</span>
              <span className="text-xs text-muted-foreground">{userRoleLabels[user.role]}</span>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20">
              {user.role}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function NavButton({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {icon}
      {label}
    </Link>
  );
}
