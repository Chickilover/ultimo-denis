import { useBalance } from "@/hooks/use-balance";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, User, Loader2 } from "lucide-react";

export function BalanceDisplay() {
  const { balance, isBalanceLoading } = useBalance();
  const { formatCurrency, defaultCurrency } = useCurrency();

  // Si está cargando, mostrar skeletons
  if (isBalanceLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BalanceCard isLoading />
        <BalanceCard isLoading />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BalanceCard
        title="Tus Fondos Personales"
        amount={balance?.personalBalance || 0}
        currency={defaultCurrency || "UYU"}
        icon={<User className="h-8 w-8 text-blue-500 group-hover:text-blue-600 transition-colors" />}
        colorClass="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-blue-100 dark:shadow-blue-900/20"
        textColorClass="text-blue-700 dark:text-blue-300"
        description="Fondos para gastos privados"
      />
      <BalanceCard
        title="Fondos Compartidos"
        amount={balance?.familyBalance || 0}
        currency={defaultCurrency || "UYU"}
        icon={<Users className="h-8 w-8 text-purple-500 group-hover:text-purple-600 transition-colors" />}
        colorClass="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 shadow-purple-100 dark:shadow-purple-900/20"
        textColorClass="text-purple-700 dark:text-purple-300"
        description="Fondos para gastos del hogar"
      />
    </div>
  );
}

interface BalanceCardProps {
  title?: string;
  amount?: number;
  currency?: string;
  icon?: React.ReactNode;
  colorClass?: string;
  textColorClass?: string;
  isLoading?: boolean;
}

function BalanceCard({
  title,
  amount,
  currency,
  icon,
  colorClass = "",
  textColorClass = "",
  isLoading = false,
}: BalanceCardProps) {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${colorClass} shadow-lg group relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`${textColorClass} text-sm font-medium`}>{title}</CardTitle>
        <div className="rounded-full p-2 bg-white/40 dark:bg-black/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${textColorClass} text-2xl font-bold mb-1`}>
          {formatCurrency(amount ?? 0, currency ?? "UYU")}
        </div>
        <p className="text-sm opacity-70">Balance actual</p>
      </CardContent>
      {/* Efecto decorativo */}
      <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm" />
    </Card>
  );
}