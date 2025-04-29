import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useTheme } from "@/hooks/use-theme";
import { PWAInstall } from "@/lib/pwa-install";
import { 
  MenuIcon, 
  BellIcon, 
  UserIcon, 
  SunIcon, 
  MoonIcon,
  HomeIcon, 
  CreditCardIcon, 
  PlusIcon,
  BarChart3Icon, 
  PiggyBankIcon,
  XIcon,
  LogOutIcon,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

interface MobileNavProps {
  onOpenTransactionForm: () => void;
}

export function MobileNav({ onOpenTransactionForm }: MobileNavProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const { defaultCurrency, setDefaultCurrency } = useCurrency();
  const [sheetOpen, setSheetOpen] = useState(false);

  const menuItems = [
    { path: "/", label: "Inicio", icon: <HomeIcon className="h-5 w-5" /> },
    { path: "/transactions", label: "Transacciones", icon: <CreditCardIcon className="h-5 w-5" /> },
    { path: "/budgets", label: "Presupuestos", icon: <BarChart3Icon className="h-5 w-5" /> },
    { path: "/savings", label: "Metas", icon: <PiggyBankIcon className="h-5 w-5" /> },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      {/* Mobile Header - Estilo App moderno */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/30 shadow-md fixed top-0 left-0 right-0 z-20 h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-primary/10">
                  <MenuIcon className="h-6 w-6 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground">
                <SheetHeader className="p-6 border-b border-sidebar-border/40 relative">
                  <div className="absolute w-40 h-40 bg-accent/30 rounded-full blur-3xl opacity-20 -top-16 -left-10"></div>
                  <SheetTitle className="text-white text-xl font-bold relative z-10">Nido Financiero</SheetTitle>
                  <SheetClose className="absolute top-5 right-5 text-white bg-white/10 rounded-full p-1 hover:bg-white/20 transition-colors">
                    <XIcon className="h-5 w-5" />
                  </SheetClose>
                </SheetHeader>
                <div className="mt-4 px-3">
                  <nav>
                    <ul className="space-y-2">
                      {/* Full menu items for mobile sheet - estilo app */}
                      <li>
                        <Link href="/">
                          <div
                            className={cn(
                              "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                              location === "/"
                                ? "bg-white/20 text-white shadow-sm"
                                : "text-sidebar-foreground/90 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg",
                              location === "/" ? "bg-white/20" : "bg-transparent"
                            )}>
                              <HomeIcon className="h-5 w-5" />
                            </div>
                            <span className="ml-3 font-medium">Inicio</span>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/transactions">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/transactions"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <CreditCardIcon className="h-5 w-5" />
                            <span className="ml-3">Transacciones</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/accounts">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/accounts"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <CreditCardIcon className="h-5 w-5" />
                            <span className="ml-3">Cuentas</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/budgets">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/budgets"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <BarChart3Icon className="h-5 w-5" />
                            <span className="ml-3">Presupuestos</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/savings">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/savings"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <PiggyBankIcon className="h-5 w-5" />
                            <span className="ml-3">Metas de Ahorro</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/reports">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/reports"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <BarChart3Icon className="h-5 w-5" />
                            <span className="ml-3">Reportes</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/scanner">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/scanner"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <BarChart3Icon className="h-5 w-5" />
                            <span className="ml-3">Escáner</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/advisor">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/advisor"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <BarChart3Icon className="h-5 w-5" />
                            <span className="ml-3">Asesor IA</span>
                          </a>
                        </Link>
                      </li>
                      <li>
                        <Link href="/settings">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/settings"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <BarChart3Icon className="h-5 w-5" />
                            <span className="ml-3">Configuración</span>
                          </a>
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
                <div className="mt-auto px-4 py-6 border-t border-sidebar-border/40 backdrop-blur-sm bg-sidebar/90">
                  {user && (
                    <div className="flex flex-col">
                      <div className="flex items-center mb-5">
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
                        >
                          <UserIcon className="mr-2 h-5 w-5" />
                          Mi Perfil
                        </Button>
                        
                        {/* Componente de instalación PWA en el menú lateral */}
                        <div className="flex justify-center my-2">
                          <PWAInstall />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10 rounded-lg py-2.5"
                          onClick={handleLogout}
                          disabled={logoutMutation.isPending}
                        >
                          <LogOutIcon className="mr-2 h-5 w-5" />
                          Cerrar Sesión
                          {logoutMutation.isPending && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-primary">Nido Financiero</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="hidden sm:block">
              <PWAInstall />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                  <BellIcon className="h-6 w-6 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto py-1">
                  <div className="px-3 py-2 text-sm border-b dark:border-gray-700">
                    <div className="font-medium mb-1">Alerta de presupuesto: Supermercado</div>
                    <p className="text-muted-foreground">Has alcanzado el 90% de tu presupuesto mensual</p>
                    <p className="text-xs text-muted-foreground mt-1">Hace 1 hora</p>
                  </div>
                  <div className="px-3 py-2 text-sm border-b dark:border-gray-700">
                    <div className="font-medium mb-1">Recordatorio de pago: Tarjeta Visa</div>
                    <p className="text-muted-foreground">Vence en 3 días</p>
                    <p className="text-xs text-muted-foreground mt-1">Hace 3 horas</p>
                  </div>
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium mb-1">¡Meta alcanzada!</div>
                    <p className="text-muted-foreground">Has completado tu meta "Fondo de emergencia"</p>
                    <p className="text-xs text-muted-foreground mt-1">Hace 1 día</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="p-2 text-center">
                  <Button variant="ghost" size="sm" className="w-full">
                    Ver todas las notificaciones
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-primary/10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunIcon className="h-6 w-6 text-primary" /> : <MoonIcon className="h-6 w-6 text-primary" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full p-0">
                  <div className="h-9 w-9 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/settings">
                    <div className="flex items-center w-full">
                      <MenuIcon className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleLogout()}>
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Estilo App */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-xl">
        <div className="grid grid-cols-5 gap-1 px-1 py-1">
          {menuItems.map((item, index) => (
            <Link href={item.path} key={index}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200",
                  location === item.path 
                    ? "text-primary bg-primary/10 scale-105 shadow-sm" 
                    : "text-foreground/60 hover:text-primary hover:bg-background"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full mb-1",
                  location === item.path 
                    ? "bg-primary/10" 
                    : "bg-transparent"
                )}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
          
          {/* Botón flotante de añadir transacción */}
          <Button
            className="flex flex-col items-center justify-center py-2 rounded-lg hover:bg-background"
            variant="ghost"
            onClick={onOpenTransactionForm}
          >
            <div className="bg-primary shadow-lg rounded-full p-3 mb-1 transform hover:scale-110 transition-transform duration-200">
              <PlusIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-foreground/60">Añadir</span>
          </Button>
        </div>
      </div>
    </>
  );
}
