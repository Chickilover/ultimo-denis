import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { calculateProgress } from "@/lib/utils";
import { 
  Sparkles, 
  Shield, 
  Home 
} from "lucide-react";

// Iconos para tipos comunes de metas de ahorro
const goalIconsMap: Record<string, any> = {
  "vacaciones": <Sparkles className="h-5 w-5 text-primary-500" />,
  "emergencia": <Shield className="h-5 w-5 text-green-500" />,
  "casa": <Home className="h-5 w-5 text-accent-500" />,
};

// Función para determinar qué icono usar según el nombre de la meta
const getGoalIcon = (goalName: string) => {
  // Convertir a minúsculas para facilitar la coincidencia
  const name = goalName.toLowerCase();
  
  // Verificar si el nombre contiene alguna de las palabras clave
  if (name.includes('vacacion')) return goalIconsMap['vacaciones'];
  if (name.includes('emergencia') || name.includes('fondo')) return goalIconsMap['emergencia'];
  if (name.includes('casa') || name.includes('hogar') || name.includes('apartamento')) return goalIconsMap['casa'];
  
  // Retornar null si no hay coincidencia
  return null;
};

export function SavingsGoals() {
  const { formatCurrency } = useCurrency();
  
  // Fetch savings goals
  const { data: goals = [] } = useQuery({
    queryKey: ["/api/savings-goals"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Format deadline text
  const getDeadlineText = (deadline: string | null) => {
    if (!deadline) return "Sin fecha límite";
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    // Calculate months difference
    const diffMonths = (deadlineDate.getFullYear() - today.getFullYear()) * 12 + 
                       (deadlineDate.getMonth() - today.getMonth());
    
    if (diffMonths < 0) return "Fecha límite pasada";
    if (diffMonths === 0) return "Este mes";
    if (diffMonths === 1) return "Falta 1 mes";
    return `Faltan ${diffMonths} meses`;
  };
  
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
          {goals.length > 0 ? (
            goals.slice(0, 3).map((goal: any, index: number) => {
              const progress = calculateProgress(
                parseFloat(goal.currentAmount), 
                parseFloat(goal.targetAmount)
              );
              
              const isCompleted = progress >= 100;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      {getGoalIcon(goal.name) || 
                       <div className="h-5 w-5 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                         {goal.name.charAt(0)}
                       </div>
                      }
                      <span className="text-sm font-medium ml-2">{goal.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={isCompleted ? "bg-green-500 h-2 rounded-full" : "bg-primary h-2 rounded-full"} 
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isCompleted ? "Meta alcanzada" : getDeadlineText(goal.deadline)}
                    </p>
                    <p className={`text-xs ${isCompleted ? "text-green-600 dark:text-green-400" : "text-primary"}`}>
                      {progress.toFixed(0)}% completado
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <p>No hay metas de ahorro</p>
              <Link href="/savings">
                <Button variant="outline" size="sm" className="mt-2">
                  Crear meta de ahorro
                </Button>
              </Link>
            </div>
          )}
          
          <Link href="/savings">
            <Button className="w-full" variant="outline">
              + Nueva Meta de Ahorro
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
