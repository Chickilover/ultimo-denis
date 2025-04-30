import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBalance, TransferData } from "@/hooks/use-balance";
import { useCurrency } from "@/hooks/use-currency";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightLeft, Loader2 } from "lucide-react";

// Schema de validación
const transferSchema = z.object({
  direction: z.enum(["toFamily", "toPersonal"]),
  amount: z.string().min(1, "El monto es requerido").refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Debe ser un número positivo" }
  ),
  currency: z.string().min(1, "La moneda es requerida"),
  description: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface BalanceTransferFormProps {
  onSuccess?: () => void;
}

export function BalanceTransferForm({ onSuccess }: BalanceTransferFormProps) {
  const { balance, createTransfer, isTransferring } = useBalance();
  const { defaultCurrency, formatCurrency } = useCurrency();
  const [direction, setDirection] = useState<"toFamily" | "toPersonal">("toFamily");

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      direction: "toFamily",
      amount: "",
      currency: defaultCurrency || "UYU",
      description: "",
    },
  });

  function onSubmit(data: TransferFormValues) {
    const transferData: TransferData = {
      fromPersonal: data.direction === "toFamily",
      amount: parseFloat(data.amount),
      currency: data.currency,
      description: data.description,
    };

    createTransfer(transferData, {
      onSuccess: () => {
        form.reset();
        if (onSuccess) onSuccess();
      },
    });
  }

  // Determinar saldo disponible según la dirección de transferencia
  const availableBalance = direction === "toFamily" 
    ? balance?.personalBalance ?? 0 
    : balance?.familyBalance ?? 0;

  const balanceLabel = direction === "toFamily" 
    ? "Balance Personal" 
    : "Balance Familiar";

  // Determinar color según el tipo de balance
  const personalBalanceColor = "text-blue-600 dark:text-blue-400";
  const familyBalanceColor = "text-purple-600 dark:text-purple-400";
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transferir Fondos
        </CardTitle>
        <CardDescription>
          Mueva dinero entre su balance personal y familiar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Balance Personal:</p>
                <p className={`text-lg font-bold ${personalBalanceColor}`}>
                  {formatCurrency(balance?.personalBalance || 0, defaultCurrency || "UYU")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Balance Familiar:</p>
                <p className={`text-lg font-bold ${familyBalanceColor}`}>
                  {formatCurrency(balance?.familyBalance || 0, defaultCurrency || "UYU")}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <Select
                    onValueChange={(value: "toFamily" | "toPersonal") => {
                      field.onChange(value);
                      setDirection(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar dirección" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="toFamily">De Personal a Familiar</SelectItem>
                      <SelectItem value="toPersonal">De Familiar a Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0.01"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {balanceLabel} disponible: {formatCurrency(availableBalance, defaultCurrency || "UYU")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UYU">Pesos Uruguayos (UYU)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Ingrese una descripción"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transfiriendo...
                </>
              ) : (
                "Transferir"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}