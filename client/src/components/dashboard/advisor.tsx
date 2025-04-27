import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BrainCircuit } from "lucide-react";

// In a real application, these insights would be generated based on actual user data
// Here we're using mock data for demonstration purposes
const advisorInsights = [
  {
    id: 1,
    title: "Gasto elevado en Restaurantes",
    content: "Este mes, tu gasto en Restaurantes y Delivery fue de 6.350 $U, un 15% más que el mes pasado. ¿Hubo alguna ocasión especial?",
    action: "Ver detalles",
    type: "warning"
  },
  {
    id: 2,
    title: "Potencial de ahorro",
    content: "Basado en tus ingresos y gastos habituales, tienes un potencial de ahorro mensual estimado de 15.000 $U.",
    action: "Ver sugerencias de ahorro",
    type: "tip"
  },
  {
    id: 3,
    title: "Suscripciones activas",
    content: "Actualmente tienes 3 suscripciones recurrentes por un total de 1.890 $U mensuales. Revisa si sigues utilizando todas.",
    action: "Revisar suscripciones",
    type: "info"
  }
];

export function Advisor() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary-50 dark:bg-primary-900/30 border-b dark:border-primary-800 space-y-0 pb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div className="ml-3">
            <CardTitle className="text-lg text-primary-800 dark:text-primary-200">
              Asesor Financiero IA
            </CardTitle>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Consejos personalizados para mejorar tus finanzas
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {advisorInsights.map((insight) => (
            <div 
              key={insight.id} 
              className={`rounded-lg border p-4 ${
                insight.type === 'warning' 
                  ? 'border-amber-200 dark:border-amber-900' 
                  : insight.type === 'tip' 
                    ? 'border-green-200 dark:border-green-900' 
                    : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{insight.title}: </span>
                {insight.content}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-primary dark:text-primary-400 p-0 h-auto hover:bg-transparent hover:underline"
              >
                {insight.action}
              </Button>
            </div>
          ))}
          
          <Link href="/advisor">
            <Button className="w-full mt-3 flex items-center justify-center" variant="outline">
              Ver todos los consejos
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
