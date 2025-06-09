import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // DialogTrigger removed as it's not explicitly used here, can be added if needed by specific invocation patterns
import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
// useTheme hook is not used in this file, can be removed if not planned for future use.
// import { useTheme } from "@/hooks/use-theme";
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { useCurrency } from "@/hooks/use-currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusIcon, Pencil, Trash2, User as UserIcon, Camera, Lock, Palette, ArrowRightLeft, Check,
  ShoppingCart, Home, Car, Utensils, HeartPulse, Shirt, GraduationCap, PartyPopper, Wallet,
  PiggyBank, Building, PlugZap, Cable, Gift, Banknote, Wrench, PencilRuler, Baby, Plane, Coffee, Gamepad2, 
  Activity, CreditCard, Folder
} from "lucide-react"; // Renamed User from lucide to UserIcon to avoid conflict
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { User, Settings, Category, InsertCategory } from "@shared/schema"; // Import types

// Esquema para actualizar perfil
const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  avatarColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  incomeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  expenseColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
});
type ProfileFormData = z.infer<typeof profileFormSchema>;

// Esquema para cambiar contraseña
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
type PasswordFormData = z.infer<typeof passwordFormSchema>;

// Esquema para categoría (usado en el modal, similar a InsertCategory pero para el form)
const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  icon: z.string().min(1, "El ícono es obligatorio"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  isIncome: z.boolean(),
});
type CategoryFormData = z.infer<typeof categoryFormSchema>;


export default function SettingsPage() {
  const [defaultCurrencyState, setDefaultCurrencyState] = useState("UYU");
  const [localExchangeRate, setLocalExchangeRate] = useState("38.50"); // For input editing
  const [themeState, setThemeState] = useState("light");
  const [languageState, setLanguageState] = useState("es");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateExchangeRate: updateGlobalExchangeRate, exchangeRate: globalExchangeRate } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { activeTab: activeSettingsTab, setActiveTab: setActiveSettingsTab } = useProfileSettings();
  const [avatar, setAvatar] = useState<string | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormValues, setCategoryFormValues] = useState<CategoryFormData>({
    name: "",
    icon: "Folder",
    color: "#6366f1",
    isIncome: false,
  });
  const [activeCategoriesTab, setActiveCategoriesTab] = useState("gastos");

  const { data: user, isLoading: userLoading } = useQuery<User, Error, User, QueryKey>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<Settings, Error, Settings, QueryKey>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: categoriesData = [] as Category[], isLoading: categoriesLoading } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    initialData: [], // Provide initial empty array to prevent undefined map errors
  });
  
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      avatarColor: "#6366f1",
      incomeColor: "#10b981",
      expenseColor: "#ef4444",
    },
  });
  
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (settingsData) {
      setDefaultCurrencyState(settingsData.defaultCurrency ?? "UYU");
      setThemeState(settingsData.theme ?? "light");
      setLanguageState(settingsData.language ?? "es");
      const exchangeRateValue = settingsData.exchangeRate ?? "38";
      const roundedValue = parseFloat(exchangeRateValue).toFixed(2); // Keep 2 decimals for display
      setLocalExchangeRate(roundedValue);
    }
  }, [settingsData]);
  
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name ?? "",
        avatarColor: user.avatarColor ?? "#6366f1",
        incomeColor: user.incomeColor ?? "#10b981",
        expenseColor: user.expenseColor ?? "#ef4444",
      });
      if (user.avatar) setAvatar(user.avatar);
    }
  }, [user, profileForm]);

  const createCategoryMutation = useMutation<Category, Error, InsertCategory>({
    mutationFn: async (data) => apiRequest("POST", "/api/categories", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría creada", description: "La categoría se ha creado correctamente" });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear la categoría: ${error.message}`, variant: "destructive" })
  });

  const updateCategoryMutation = useMutation<Category, Error, {id: number; data: Partial<InsertCategory>}>({
    mutationFn: async ({id, data}) => apiRequest("PUT", `/api/categories/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría actualizada", description: "La categoría se ha actualizado correctamente" });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la categoría: ${error.message}`, variant: "destructive" })
  });

  const deleteCategoryMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría eliminada", description: "La categoría se ha eliminado correctamente" });
    },
    onError: (error) => toast({ title: "Error", description: `Error al eliminar la categoría: ${error.message}`, variant: "destructive" })
  });

  const updateSettingsMutation = useMutation<Settings, Error, Partial<Settings>>({
    mutationFn: async (data) => apiRequest("PUT", "/api/settings", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configuración actualizada", description: "La configuración se ha actualizado correctamente" });
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la configuración: ${error.message}`, variant: "destructive" })
  });
  
  const updateProfileMutation = useMutation<User, Error, ProfileFormData>({
    mutationFn: async (data) => apiRequest("PUT", "/api/user", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Perfil actualizado", description: "Tu perfil se ha actualizado correctamente" });
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar el perfil: ${error.message}`, variant: "destructive" })
  });
  
  const changePasswordMutation = useMutation<any, Error, PasswordFormData>({
    mutationFn: async (data) => apiRequest("PUT", "/api/user/password", data).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Contraseña actualizada", description: "Tu contraseña se ha actualizado correctamente" });
      passwordForm.reset();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la contraseña: ${error.message}`, variant: "destructive" })
  });
  
  const uploadAvatarMutation = useMutation<{ avatar: string }, Error, FormData>({
    mutationFn: async (formData) => {
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const error = await res.json(); throw new Error(error.message || "Error al subir el avatar"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setAvatar(`${data.avatar}?t=${new Date().getTime()}`);
      toast({ title: "Avatar actualizado", description: "Tu avatar se ha actualizado correctamente" });
    },
    onError: (error) => toast({ title: "Error", description: `Error al subir el avatar: ${error.message}`, variant: "destructive" })
  });

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryFormValues({
      name: category.name,
      icon: category.icon,
      color: category.color,
      isIncome: category.isIncome,
    });
    setCategoryDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryFormValues({
      name: "",
      icon: "Folder",
      color: "#6366f1",
      isIncome: activeCategoriesTab === "ingresos",
    });
  };

  const saveSettings = () => {
    if (updateSettingsMutation.isPending) return;
    const formattedRate = parseFloat(localExchangeRate).toFixed(2);
    setLocalExchangeRate(formattedRate);
    updateGlobalExchangeRate(formattedRate);
    updateSettingsMutation.mutate({
      defaultCurrency: defaultCurrencyState,
      theme: themeState,
      language: languageState,
      exchangeRate: formattedRate
    });
  };

  const updateExchangeRateOnServer = async () => { // Renamed to avoid conflict with context's updateExchangeRate
    if (updateSettingsMutation.isPending) return;
    if (!localExchangeRate || localExchangeRate.trim() === "") {
      toast({ title: "Error", description: "Por favor ingresa un valor para el tipo de cambio", variant: "destructive" });
      return;
    }
    const numValue = parseFloat(localExchangeRate);
    if (isNaN(numValue)) {
      toast({ title: "Error", description: "El valor del tipo de cambio debe ser un número válido", variant: "destructive" });
      return;
    }
    const formattedValue = numValue.toFixed(2);
    toast({ title: "Actualizando...", description: "Actualizando tipo de cambio" });
    setLocalExchangeRate(formattedValue);
    updateGlobalExchangeRate(formattedValue); // Update context immediately
    try {
      await updateSettingsMutation.mutateAsync({
        exchangeRate: formattedValue,
        lastExchangeRateUpdate: new Date().toISOString(),
        defaultCurrency: defaultCurrencyState,
        theme: themeState,
        language: languageState
      });
      toast({ title: "Tipo de cambio actualizado", description: `El tipo de cambio ha sido actualizado a ${formattedValue}` });
    } catch (err) {
      console.error("Error al actualizar tipo de cambio:", err);
      toast({ title: "Error", description: "Ocurrió un error al actualizar el tipo de cambio", variant: "destructive" });
      setLocalExchangeRate(globalExchangeRate.toString()); // Revert to global state on error
    }
  };

  const saveCategory = () => {
    const { name, icon, color, isIncome } = categoryFormValues;
    if (!name || !icon || !color) {
      toast({ title: "Error", description: "Todos los campos son obligatorios", variant: "destructive" });
      return;
    }
    const categoryData: InsertCategory = { name, icon, color, isIncome, parentId: null };

    if (editingCategoryId) {
      if (!updateCategoryMutation.isPending) updateCategoryMutation.mutate({ id: editingCategoryId, data: categoryData });
    } else {
      if (!createCategoryMutation.isPending) createCategoryMutation.mutate(categoryData);
    }
  };
  
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Error", description: "La imagen es demasiado grande. Máximo 5MB.", variant: "destructive" }); return; }
    if (!file.type.startsWith("image/")) { toast({ title: "Error", description: "El archivo debe ser una imagen.", variant: "destructive" }); return; }
    const formData = new FormData();
    formData.append("avatar", file);
    uploadAvatarMutation.mutate(formData);
  };
  
  const onPasswordSubmit = (data: PasswordFormData) => {
    if (!changePasswordMutation.isPending) changePasswordMutation.mutate(data);
  };
  
  const onProfileSubmit = (data: ProfileFormData) => {
    if (!updateProfileMutation.isPending) updateProfileMutation.mutate(data);
  };

  if (userLoading || settingsLoading || categoriesLoading) {
    // TODO: Add a proper loading skeleton or spinner
    return <Shell>Cargando configuración...</Shell>;
  }

  return (
    <Shell>
      <PageHeader title="Configuración" description="Gestiona las preferencias de tu aplicación" />
      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="perfil">Mi Perfil</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid gap-6">
        {activeSettingsTab === "general" && (
          <>
            <Card>
              <CardHeader><CardTitle>Configuración General</CardTitle><CardDescription>Configura las opciones básicas de tu aplicación</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda predeterminada</Label>
                  <Select value={defaultCurrencyState} onValueChange={setDefaultCurrencyState}>
                    <SelectTrigger id="currency" className="w-full"><SelectValue placeholder="Selecciona moneda" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UYU">Peso Uruguayo (UYU)</SelectItem>
                      <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={languageState} onValueChange={setLanguageState}>
                    <SelectTrigger id="language" className="w-full"><SelectValue placeholder="Selecciona idioma" /></SelectTrigger>
                    <SelectContent><SelectItem value="es">Español</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label htmlFor="theme">Tema Oscuro</Label><p className="text-sm text-muted-foreground">Cambiar entre el tema claro y oscuro</p></div>
                  <Switch id="theme" checked={themeState === "dark"} onCheckedChange={(checked) => setThemeState(checked ? "dark" : "light")} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tipo de Cambio</CardTitle><CardDescription>Actualiza el tipo de cambio para convertir entre monedas</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="exchange-rate">Dólar Estadounidense (USD) a Peso Uruguayo (UYU)</Label>
                  <div className="flex space-x-2">
                    <Input id="exchange-rate" placeholder="38.50" type="number" step="0.01" min="0" value={localExchangeRate}
                      onChange={(e) => setLocalExchangeRate(e.target.value)}
                      onBlur={() => {
                        const numValue = parseFloat(localExchangeRate);
                        if (!isNaN(numValue)) setLocalExchangeRate(numValue.toFixed(2));
                        else setLocalExchangeRate(globalExchangeRate.toString()); // Revert if invalid
                      }}
                    />
                    <Button onClick={updateExchangeRateOnServer}>Actualizar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Última actualización: {settingsData?.lastExchangeRateUpdate ? new Date(settingsData.lastExchangeRateUpdate).toLocaleDateString('es-UY') : 'Nunca'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>Cancelar</Button>
              <Button onClick={saveSettings} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </>
        )}
        
        {activeSettingsTab === "perfil" && user && (
          <Card>
            <CardHeader><CardTitle>Mi Perfil</CardTitle><CardDescription>Actualiza tu información personal y preferencias</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      {avatar ? (
                        <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/20">
                          <img src={avatar} alt="Avatar" className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.classList.add('flex', 'items-center', 'justify-center', 'text-xl', 'font-semibold', 'text-white');
                                parent.style.backgroundColor = user?.avatarColor ?? "#6366f1";
                                parent.innerHTML = user?.name?.substring(0, 2).toUpperCase() || "U";
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-full flex items-center justify-center text-xl font-semibold text-white border-4 border-primary/20"
                          style={{ backgroundColor: user?.avatarColor ?? "#6366f1" }}
                        >
                          {user?.name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                      )}
                      <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium">{user?.name ?? 'Usuario'}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email ?? 'Email no disponible'}</p>
                    </div>
                  </div>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField control={profileForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={profileForm.control} name="avatarColor" render={({ field }) => (
                        <FormItem><FormLabel>Color de avatar</FormLabel><FormControl><div className="flex items-center space-x-2">
                          <div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} />
                          <Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )}/>
                       <FormField control={profileForm.control} name="incomeColor" render={({ field }) => (
                        <FormItem><FormLabel>Color para ingresos</FormLabel><FormControl><div className="flex items-center space-x-2">
                          <div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} />
                          <Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )}/>
                       <FormField control={profileForm.control} name="expenseColor" render={({ field }) => (
                        <FormItem><FormLabel>Color para gastos</FormLabel><FormControl><div className="flex items-center space-x-2">
                          <div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} />
                          <Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )}/>
                      <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}>
                        {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </form>
                  </Form>
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Cambiar contraseña</CardTitle></CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem><FormLabel>Contraseña actual</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                            <FormItem><FormLabel>Nueva contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirmar nueva contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
                            {changePasswordMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeSettingsTab === "categorias" && (
          <Card>
            <CardHeader><CardTitle>Gestión de Categorías</CardTitle><CardDescription>Crea, edita y elimina categorías para organizar tus transacciones</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeCategoriesTab} onValueChange={setActiveCategoriesTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gastos">Categorías de Gastos</TabsTrigger>
                  <TabsTrigger value="ingresos">Categorías de Ingresos</TabsTrigger>
                </TabsList>
                <TabsContent value="gastos" className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => { resetCategoryForm(); setCategoryFormValues(prev => ({...prev, isIncome: false})); setCategoryDialogOpen(true); }}>
                      <PlusIcon className="h-4 w-4 mr-2" /> Nueva Categoría
                    </Button>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Icono</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {categoriesData.filter((category) => !category.isIncome && !category.isSystem).map((category) => (
                          <TableRow key={category.id}>
                            <TableCell>{category.name}</TableCell><TableCell>{category.icon}</TableCell>
                            <TableCell><div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} /></TableCell>
                            <TableCell className="text-right"><div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`¿Estás seguro que deseas eliminar la categoría "${category.name}"?`)) deleteCategoryMutation.mutate(category.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="ingresos" className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => { resetCategoryForm(); setCategoryFormValues(prev => ({...prev, isIncome: true})); setCategoryDialogOpen(true); }}>
                      <PlusIcon className="h-4 w-4 mr-2" /> Nueva Categoría
                    </Button>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Icono</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {categoriesData.filter((category) => category.isIncome && !category.isSystem).map((category) => (
                           <TableRow key={category.id}>
                            <TableCell>{category.name}</TableCell><TableCell>{category.icon}</TableCell>
                            <TableCell><div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} /></TableCell>
                            <TableCell className="text-right"><div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`¿Estás seguro que deseas eliminar la categoría "${category.name}"?`)) deleteCategoryMutation.mutate(category.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategoryId ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>{editingCategoryId ? "Modifica los detalles de la categoría existente" : "Crea una nueva categoría para organizar tus transacciones"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="category-name">Nombre</Label><Input id="category-name" value={categoryFormValues.name} onChange={(e) => setCategoryFormValues(prev => ({...prev, name: e.target.value}))} placeholder="Alimentación"/></div>
            <div className="space-y-2"><Label htmlFor="category-icon">Icono</Label>
              <Select value={categoryFormValues.icon} onValueChange={(value) => setCategoryFormValues(prev => ({...prev, icon: value}))}>
                <SelectTrigger id="category-icon" className="w-full"><SelectValue placeholder="Selecciona un icono" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ShoppingCart">🛒 Compras</SelectItem><SelectItem value="Home">🏠 Hogar</SelectItem><SelectItem value="Car">🚗 Transporte</SelectItem><SelectItem value="Utensils">🍔 Alimentación</SelectItem>
                  <SelectItem value="HeartPulse">💊 Salud</SelectItem><SelectItem value="Shirt">👕 Ropa</SelectItem><SelectItem value="GraduationCap">🎓 Educación</SelectItem><SelectItem value="PartyPopper">🎉 Ocio</SelectItem>
                  <SelectItem value="Wallet">💰 Finanzas</SelectItem><SelectItem value="PiggyBank">🐷 Ahorros</SelectItem><SelectItem value="Building">🏢 Trabajo</SelectItem><SelectItem value="PlugZap">⚡ Servicios</SelectItem>
                  <SelectItem value="Cable">📱 Comunicaciones</SelectItem><SelectItem value="Gift">🎁 Regalos</SelectItem><SelectItem value="Banknote">💵 Ingresos</SelectItem><SelectItem value="Wrench">🔧 Mantenimiento</SelectItem>
                  <SelectItem value="PencilRuler">✏️ Material Oficina</SelectItem><SelectItem value="Baby">👶 Niños</SelectItem><SelectItem value="Plane">✈️ Viajes</SelectItem><SelectItem value="Coffee">☕ Café</SelectItem>
                  <SelectItem value="Gamepad2">🎮 Juegos</SelectItem><SelectItem value="Activity">📊 Inversiones</SelectItem><SelectItem value="CreditCard">💳 Tarjetas</SelectItem><SelectItem value="Folder">📁 Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="category-color">Color</Label><Input id="category-color" type="color" value={categoryFormValues.color} onChange={(e) => setCategoryFormValues(prev => ({...prev, color: e.target.value}))}/></div>
            <div className="flex items-center space-x-2">
              <Checkbox id="category-is-income" checked={categoryFormValues.isIncome} onCheckedChange={(checked) => setCategoryFormValues(prev => ({...prev, isIncome: !!checked}))}/>
              <Label htmlFor="category-is-income">Es categoría de ingresos</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {createCategoryMutation.isPending || updateCategoryMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}