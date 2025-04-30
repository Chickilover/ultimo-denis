import { useState } from "react";
import { BalanceDisplay } from "./balance-display";
import { BalanceTransferForm } from "./balance-transfer-form";
import { BalanceTransferHistory } from "./balance-transfer-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft, History } from "lucide-react";

export function BalanceSection() {
  const [activeTab, setActiveTab] = useState("transfer");

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Balances</h2>
        <p className="text-muted-foreground">
          Administre sus balances personales y familiares
        </p>
      </div>

      <BalanceDisplay />

      <Separator className="my-6" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Transferencia</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transfer" className="mt-4">
          <BalanceTransferForm onSuccess={() => setActiveTab("history")} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <BalanceTransferHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}