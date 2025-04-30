import { BalanceTransfer, useBalance } from "@/hooks/use-balance";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function BalanceTransferHistory() {
  const { transfers, isTransfersLoading } = useBalance();
  const { formatCurrency } = useCurrency();

  if (isTransfersLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transfers || transfers.length === 0) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Historial de Transferencias</CardTitle>
          <CardDescription>
            No hay transferencias para mostrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6 text-muted-foreground">
            No hay transferencias entre balances registradas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Historial de Transferencias</CardTitle>
        <CardDescription>
          Últimas transferencias entre balances personal y familiar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TransferRow key={transfer.id} transfer={transfer} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferRow({ transfer }: { transfer: BalanceTransfer }) {
  const { formatCurrency } = useCurrency();

  // Formato de fecha
  const formattedDate = format(new Date(transfer.date), "dd MMM yyyy", {
    locale: es,
  });

  // Determinar tipo de transferencia y colores
  const isPersonalToFamily = transfer.fromPersonal;
  const transferTypeLabel = isPersonalToFamily
    ? "Personal → Familiar"
    : "Familiar → Personal";
  const transferIcon = isPersonalToFamily ? (
    <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
  ) : (
    <ArrowDownToLine className="h-4 w-4 text-purple-500" />
  );
  const transferColorClass = isPersonalToFamily
    ? "text-blue-600 dark:text-blue-400"
    : "text-purple-600 dark:text-purple-400";

  return (
    <TableRow>
      <TableCell>{formattedDate}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 font-normal"
        >
          {transferIcon}
          {transferTypeLabel}
        </Badge>
      </TableCell>
      <TableCell className={`font-medium ${transferColorClass}`}>
        {formatCurrency(transfer.amount, transfer.currency)}
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {transfer.description || "-"}
      </TableCell>
    </TableRow>
  );
}