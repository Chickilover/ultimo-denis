import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Shell } from "@/components/layout/shell";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  CreditCard, 
  Wallet, 
  PiggyBank, 
  Building, 
  DollarSign, 
  RefreshCcw, 
  PenLine, 
  Trash2,
  Loader2,
  MoreVertical,
  BanknoteIcon
} from "lucide-react";

// Account form schema
const accountFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  accountTypeId: z.number({
    required_error: "Selecciona un tipo de cuenta"
  }),
  initialBalance: z.string().min(0),
  currency: z.string().min(1, "Selecciona una moneda"),
  isShared: z.boolean().default(false),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  closingDay: z.number().optional(),
  dueDay: z.number().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

// Account type icons
const accountTypeIcons: Record<number, JSX.Element> = {
  1: <Wallet className="h-5 w-5" />,
  2: <Building className="h-5 w-5" />,
  3: <PiggyBank className="h-5 w-5" />,
  4: <CreditCard className="h-5 w-5" />,
  5: <BanknoteIcon className="h-5 w-5" />,
  6: <DollarSign className="h-5 w-5" />,
};

export default function AccountsPage() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  
  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/accounts?shared=true"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch account types
  const { data: accountTypes = [] } = useQuery({
    queryKey: ["/api/account-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // New account form
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      accountTypeId: undefined,
      initialBalance: "0",
      currency: "UYU",
      isShared: false,
      institution: "",
      accountNumber: "",
    },
  });
  
  // Edit account form
  const editForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      accountTypeId: undefined,
      initialBalance: "0",
      currency: "UYU",
      isShared: false,
      institution: "",
      accountNumber: "",
    },
  });
  
  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const res = await apiRequest("POST", "/api/accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Cuenta creada",
        description: "La cuenta se ha creado correctamente",
      });
      setIsNewAccountOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al crear la cuenta: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (data: AccountFormValues & { id: number }) => {
      const { id, ...accountData } = data;
      const res = await apiRequest("PUT", `/api/accounts/${id}`, accountData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Cuenta actualizada",
        description: "La cuenta se ha actualizado correctamente",
      });
      setIsEditAccountOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al actualizar la cuenta: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Cuenta eliminada",
        description: "La cuenta se ha eliminado correctamente",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al eliminar la cuenta: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Submit handlers
  const onSubmit = (data: AccountFormValues) => {
    createAccountMutation.mutate(data);
  };
  
  const onEditSubmit = (data: AccountFormValues) => {
    if (!selectedAccount) return;
    updateAccountMutation.mutate({ ...data, id: selectedAccount.id });
  };
  
  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    deleteAccountMutation.mutate(selectedAccount.id);
  };
  
  // Edit account handler
  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    editForm.reset({
      name: account.name,
      accountTypeId: account.accountTypeId,
      initialBalance: account.initialBalance.toString(),
      currency: account.currency,
      isShared: account.isShared,
      institution: account.institution || "",
      accountNumber: account.accountNumber || "",
      closingDay: account.closingDay,
      dueDay: account.dueDay,
    });
    setIsEditAccountOpen(true);
  };
  
  // Filter accounts based on active tab
  const filteredAccounts = accounts.filter((account: any) => {
    if (activeTab === "all") return true;
    return account.accountTypeId === parseInt(activeTab);
  });
  
  // Get account type name
  const getAccountTypeName = (typeId: number) => {
    const accountType = accountTypes.find((type: any) => type.id === typeId);
    return accountType ? accountType.name : "Desconocido";
  };
  
  // Calculate total balance
  const getTotalBalance = (currency: string) => {
    return accounts
      .filter((account: any) => account.currency === currency)
      .reduce((total: number, account: any) => {
        return total + parseFloat(account.currentBalance);
      }, 0);
  };
  
  return (
    <Shell>
      <div className="container px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cuentas</h1>
          <Button onClick={() => setIsNewAccountOpen(true)}>
            + Nueva Cuenta
          </Button>
        </div>
        
        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Balance Total en UYU</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(getTotalBalance("UYU"), "UYU")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Balance Total en USD</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(getTotalBalance("USD"), "USD")}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Account Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="1">Efectivo</TabsTrigger>
            <TabsTrigger value="2">Corriente</TabsTrigger>
            <TabsTrigger value="3">Ahorro</TabsTrigger>
            <TabsTrigger value="4">Tarjetas</TabsTrigger>
            <TabsTrigger value="5">Préstamos</TabsTrigger>
            <TabsTrigger value="6">Inversiones</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="col-span-full text-center p-8">
              <p className="text-muted-foreground mb-4">No hay cuentas para mostrar</p>
              <Button onClick={() => setIsNewAccountOpen(true)}>
                Crear nueva cuenta
              </Button>
            </div>
          ) : (
            filteredAccounts.map((account: any) => (
              <Card key={account.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="mr-3 bg-primary/10 p-2 rounded-full">
                        {accountTypeIcons[account.accountTypeId] || <Wallet className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {getAccountTypeName(account.accountTypeId)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                          <PenLine className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance actual</p>
                      <p className="text-xl font-bold">{formatCurrency(account.currentBalance, account.currency)}</p>
                    </div>
                    {account.isShared && (
                      <span className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full">
                        Compartida
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 flex justify-end py-2">
                  <Button variant="ghost" size="sm" className="text-primary">
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    Conciliar
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        
        {/* New Account Dialog */}
        <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Cuenta</DialogTitle>
              <DialogDescription>
                Añade una nueva cuenta para gestionar tus finanzas
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Cuenta Corriente BROU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de cuenta</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de cuenta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo inicial</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            currency={form.watch("currency") as "UYU" | "USD"}
                          />
                        </FormControl>
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem>
                            <SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institución (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: BROU, Santander" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de cuenta (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Últimos 4 dígitos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("accountTypeId") === 4 && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="closingDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Día de cierre</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="Ej: 15" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Día de vencimiento</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="Ej: 25" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Cuenta compartida</FormLabel>
                        <FormDescription>
                          Esta cuenta será visible para todos los miembros del hogar
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createAccountMutation.isPending}
                  >
                    {createAccountMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Crear cuenta
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Account Dialog */}
        <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Cuenta</DialogTitle>
              <DialogDescription>
                Modifica los detalles de tu cuenta
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Cuenta Corriente BROU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="accountTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de cuenta</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de cuenta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo inicial</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            currency={editForm.watch("currency") as "UYU" | "USD"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UYU">Peso Uruguayo ($U)</SelectItem>
                            <SelectItem value="USD">Dólar Estadounidense (US$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institución (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: BROU, Santander" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de cuenta (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Últimos 4 dígitos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {editForm.watch("accountTypeId") === 4 && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="closingDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Día de cierre</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="Ej: 15" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Día de vencimiento</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="Ej: 25" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <FormField
                  control={editForm.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Cuenta compartida</FormLabel>
                        <FormDescription>
                          Esta cuenta será visible para todos los miembros del hogar
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateAccountMutation.isPending}
                  >
                    {updateAccountMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Account Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar cuenta</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
