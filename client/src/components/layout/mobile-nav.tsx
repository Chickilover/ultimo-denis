import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useTheme } from "@/hooks/use-theme";
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
  XIcon
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
      {/* Mobile Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm fixed top-0 left-0 right-0 z-20 h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground">
                <SheetHeader className="p-4 border-b border-sidebar-border">
                  <SheetTitle className="text-white">Mi Hogar Financiero</SheetTitle>
                  <SheetClose className="absolute top-4 right-4 text-white">
                    <XIcon className="h-5 w-5" />
                  </SheetClose>
                </SheetHeader>
                <div className="mt-4 px-2">
                  <nav>
                    <ul className="space-y-1">
                      {/* Full menu items for mobile sheet */}
                      <li>
                        <Link href="/">
                          <a
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                              location === "/"
                                ? "bg-white/20 text-white"
                                : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => setSheetOpen(false)}
                          >
                            <HomeIcon className="h-5 w-5" />
                            <span className="ml-3">Inicio</span>
                          </a>
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
                <div className="mt-auto px-4 py-6 border-t border-sidebar-border">
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
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-white/80 hover:text-white hover:bg-white/10 mb-2"
                      >
                        <UserIcon className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-white/80 hover:text-white hover:bg-white/10"
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                      >
                        <MenuIcon className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold text-primary">Mi Hogar Financiero</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <BellIcon className="h-6 w-6" />
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
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
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
                    <a className="flex items-center w-full">
                      <MenuIcon className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </a>
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="grid grid-cols-5 gap-1">
          {menuItems.map((item, index) => (
            <Link href={item.path} key={index}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center py-2",
                  location === item.path 
                    ? "text-primary" 
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          ))}
          
          <Button
            className="flex flex-col items-center justify-center py-2 bg-transparent text-gray-500 dark:text-gray-400 hover:bg-transparent"
            onClick={onOpenTransactionForm}
          >
            <div className="bg-primary rounded-full p-2">
              <PlusIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs mt-1">Añadir</span>
          </Button>
        </div>
      </div>
    </>
  );
}
