import { useQuery, type QueryKey } from "@tanstack/react-query"; // Import QueryKey
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { calculateProgress } from "@/lib/utils";
import { 
  Sparkles, 
  Shield, 
  Home,
  PiggyBank // Default icon
} from "lucide-react";
import type { SavingsGoal } from "@shared/schema"; // Import SavingsGoal type

// Iconos para tipos comunes de metas de ahorro
const goalIconsMap: Record<string, JSX.Element> = { // Type JSX.Element for icons
  "vacaciones": <Sparkles className="h-5 w-5 text-primary" />, // Adjusted color for consistency
  "emergencia": <Shield className="h-5 w-5 text-green-500" />,
  "casa": <Home className="h-5 w-5 text-blue-500" />, // Adjusted color
  "default": <PiggyBank className="h-5 w-5 text-muted-foreground" /> // Default icon
};

// Función para determinar qué icono usar según el nombre de la meta
const getGoalIcon = (goalName: string, goalIcon?: string | null): JSX.Element => {
  if (goalIcon && goalIconsMap[goalIcon]) { // If a specific icon is provided in goal data
    return goalIconsMap[goalIcon];
  }
  const name = goalName.toLowerCase();
  if (name.includes('vacacion')) return goalIconsMap['vacaciones'];
  if (name.includes('emergencia') || name.includes('fondo')) return goalIconsMap['emergencia'];
  if (name.includes('casa') || name.includes('hogar') || name.includes('apartamento')) return goalIconsMap['casa'];
  return goalIconsMap['default']; // Return a default icon if no match
};

export function SavingsGoals() {
  const { formatCurrency } = useCurrency();
  
  const { data: goalsData = [], isLoading, isError, error } = useQuery<SavingsGoal[], Error, SavingsGoal[], QueryKey>({
    queryKey: ["/api/savings-goals"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [] // Ensures goalsData is always SavingsGoal[]
  });
  
  const getDeadlineText = (deadline: Date | string | null | undefined): string => {
    if (!deadline) return "Sin fecha límite";
    
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day for accurate comparison

    // Check if deadlineDate is valid
    if (isNaN(deadlineDate.getTime())) {
        return "Fecha inválida";
    }
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Fecha límite pasada";
    if (diffDays === 0) return "Hoy es la fecha límite";
    if (diffDays < 30) return `Faltan ${diffDays} días`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    if (diffMonths === 1) return "Falta 1 mes";
    return `Faltan ${diffMonths} meses`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Metas de Ahorro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1 animate-pulse">
              <div className="flex justify-between items-center mb-1">
                <div className="h-5 w-2/5 bg-muted rounded"></div>
                <div className="h-5 w-1/5 bg-muted rounded"></div>
              </div>
              <div className="w-full bg-muted rounded-full h-2"></div>
              <div className="flex justify-between mt-1">
                <div className="h-3 w-1/4 bg-muted rounded"></div>
                <div className="h-3 w-1/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-md font-medium">Metas de Ahorro</CardTitle></CardHeader>
        <CardContent><p className="text-red-500">Error al cargar metas: {error?.message}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Metas de Ahorro</CardTitle>
        <Link href="/savings">
          <Button variant="link" size="sm" className="text-primary">Ver todas</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goalsData.length > 0 ? (
            goalsData.slice(0, 3).map((goal: SavingsGoal) => { // Typed goal
              const current = parseFloat(goal.currentAmount); // currentAmount is string
              const target = parseFloat(goal.targetAmount);   // targetAmount is string
              const progress = calculateProgress(current, target);
              const isCompleted = progress >= 100;
              
              return (
                <div key={goal.id} className="space-y-1"> {/* Use goal.id for key */}
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      {getGoalIcon(goal.name, goal.icon)}
                      <span className="text-sm font-medium ml-2">{goal.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(current, goal.currency)} / {formatCurrency(target, goal.currency)}
                    </span>
                  </div>
                  <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`${isCompleted ? "bg-green-500" : "bg-primary"} h-2 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {isCompleted ? "Meta alcanzada 🎉" : getDeadlineText(goal.deadline)}
                    </p>
                    <p className={`text-xs font-semibold ${isCompleted ? "text-green-600 dark:text-green-400" : "text-primary"}`}>
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <PiggyBank className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>Aún no tienes metas de ahorro.</p>
              <Link href="/savings">
                <Button variant="outline" size="sm" className="mt-3">
                  Crear mi primera meta
                </Button>
              </Link>
            </div>
          )}
          
          {goalsData.length > 0 && (
             <Link href="/savings" className="block mt-4">
                <Button className="w-full" variant="outline">
                + Nueva Meta de Ahorro
                </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
