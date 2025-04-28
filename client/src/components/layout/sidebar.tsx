import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  HomeIcon, 
  CreditCardIcon, 
  BarChart3Icon, 
  PiggyBankIcon, 
  LineChartIcon, 
  ScanTextIcon, 
  BrainCircuitIcon, 
  SettingsIcon,
  LogOutIcon,
  UserIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  UsersIcon
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const menuItems = [
    { path: "/", label: "Inicio", icon: <HomeIcon className="h-5 w-5" /> },
    { path: "/income", label: "Ingresos", icon: <ArrowUpCircleIcon className="h-5 w-5 text-green-500" /> },
    { path: "/expenses", label: "Gastos", icon: <ArrowDownCircleIcon className="h-5 w-5 text-red-500" /> },
    { path: "/budgets", label: "Presupuestos", icon: <BarChart3Icon className="h-5 w-5" /> },
    { path: "/family", label: "Hogar", icon: <UsersIcon className="h-5 w-5" /> },
    { path: "/savings", label: "Metas de Ahorro", icon: <PiggyBankIcon className="h-5 w-5" /> },
    { path: "/reports", label: "Reportes", icon: <LineChartIcon className="h-5 w-5" /> },
    { path: "/scanner", label: "Escáner", icon: <ScanTextIcon className="h-5 w-5" /> },
    { path: "/advisor", label: "Asesor IA", icon: <BrainCircuitIcon className="h-5 w-5" /> },
    { path: "/settings", label: "Configuración", icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn("fixed top-0 left-0 z-30 h-full w-64 bg-sidebar text-sidebar-foreground pt-16 flex flex-col", className)}>
      <nav className="mt-5 px-2 flex-1">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    location === item.path
                      ? "bg-white/20 text-white"
                      : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 pt-4 pb-6 border-t border-sidebar-border">
        {user && (
          <div className="flex flex-col">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/70">{user.isAdmin ? "Administrador" : "Miembro"}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Mi Perfil
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
