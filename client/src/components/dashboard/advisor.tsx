import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BrainCircuit } from "lucide-react";

interface Insight {
  id: number;
  title: string;
  content: string;
  action: string;
  type: 'warning' | 'tip' | 'info';
  link: string;
}

// Consejos genéricos que se muestran cuando no hay suficientes datos para análisis
const basicInsights: Insight[] = [
  {
    id: 1,
    title: "Registro de transacciones",
    content: "Registra tus ingresos y gastos regularmente para tener un panorama completo de tus finanzas personales y familiares.",
    action: "Registrar transacción",
    type: "tip",
    link: "/expenses"
  },
  {
    id: 2,
    title: "Define presupuestos",
    content: "Establecer presupuestos te ayudará a controlar tus gastos y alcanzar tus objetivos financieros.",
    action: "Crear presupuesto",
    type: "info",
    link: "/budgets"
  },
  {
    id: 3,
    title: "Registra tus metas de ahorro",
    content: "Define objetivos de ahorro específicos para motivarte a guardar dinero de forma constante.",
    action: "Crear meta de ahorro",
    type: "info",
    link: "/savings"
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
          {basicInsights.map((insight) => (
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
              <Link href={insight.link}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-primary dark:text-primary-400 p-0 h-auto hover:bg-transparent hover:underline"
                >
                  {insight.action}
                </Button>
              </Link>
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
