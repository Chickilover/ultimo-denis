import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfileSettings } from "@/hooks/use-profile-settings";
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
  UsersIcon,
  FolderIcon
} from "lucide-react";
// Import logo from public directory
// Note: For actual imports we could use @assets path, but using direct path for images in public folder
// which are accessible via root URL

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { setActiveTab } = useProfileSettings();
  
  // Función para navegar a la pestaña de perfil
  const navigateToProfile = () => {
    navigate("/settings");
    setActiveTab("perfil");
  };

  const menuItems = [
    { path: "/", label: "Inicio", icon: <HomeIcon className="h-5 w-5" /> },
    { path: "/income", label: "Ingresos", icon: <ArrowUpCircleIcon className="h-5 w-5 text-green-500" /> },
    { path: "/expenses", label: "Gastos", icon: <ArrowDownCircleIcon className="h-5 w-5 text-red-500" /> },
    { path: "/budgets", label: "Proyectos", icon: <FolderIcon className="h-5 w-5" /> },
    { path: "/accounts", label: "Invitaciones", icon: <CreditCardIcon className="h-5 w-5" /> },
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
    <aside className={cn("fixed top-0 left-0 z-30 h-full w-64 bg-sidebar text-sidebar-foreground pt-5 flex flex-col shadow-xl", className)}>
      {/* Logo con efecto de brillo */}
      <div className="flex justify-center items-center mb-6 relative">
        <div className="absolute w-40 h-40 bg-accent/30 rounded-full blur-3xl opacity-20 -top-16"></div>
        <img src="/images/logo.png" alt="Nido Financiero" className="h-16 w-auto relative z-10 drop-shadow-md" />
      </div>
      
      {/* Navegación Principal con estilos mejorados */}
      <nav className="mt-2 px-3 flex-1">
        <ul className="space-y-1.5">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <div
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    location === item.path
                      ? "bg-white/20 text-white shadow-md transform scale-105"
                      : "text-sidebar-foreground/90 hover:bg-white/10 hover:text-white hover:scale-102"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg",
                    location === item.path ? "bg-white/20" : "bg-transparent"
                  )}>
                    {item.icon}
                  </div>
                  <span className="ml-3 font-medium">{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Perfil de Usuario con glassmorfismo */}
      <div className="px-4 pt-4 pb-6 mt-auto border-t border-sidebar-border/40 backdrop-blur-sm bg-sidebar/90">
        {user && (
          <div className="flex flex-col">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-inner">
                {user.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-white">{user.username || 'Usuario'}</p>
                <p className="text-xs text-white/80 flex items-center">
                  {user.isAdmin ? (
                    <>
                      <span className="inline-block w-2 h-2 bg-secondary rounded-full mr-1.5"></span>
                      Administrador
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1.5"></span>
                      Miembro
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10 rounded-lg py-2.5"
                onClick={navigateToProfile}
              >
                <UserIcon className="mr-2 h-5 w-5" />
                Mi Perfil
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10 rounded-lg py-2.5"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOutIcon className="mr-2 h-5 w-5" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
