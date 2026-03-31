import { Link, useLocation } from "wouter";
import { Activity, AlertTriangle, BarChart3, Database, Home, ShieldAlert, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVoterId } from "@/lib/voter-id";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const voterId = getVoterId();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/elections", label: "Elections", icon: Database },
    { href: "/fraud", label: "Fraud Alerts", icon: ShieldAlert },
    { href: "/admin", label: "Admin Panel", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden dark">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col h-full z-10 relative">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Activity className="h-6 w-6 text-primary mr-3" />
          <h1 className="font-mono text-sm font-bold tracking-tight text-sidebar-foreground uppercase">
            VOTE_SYS // 9.0
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-mono transition-colors cursor-pointer group",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-2 border-transparent"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">Current Session</p>
              <p className="text-sm font-mono font-medium text-sidebar-foreground">{voterId}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <header className="h-16 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-8 z-10">
          <div className="flex-1 flex items-center space-x-4">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              System Online // Secure Connection
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
