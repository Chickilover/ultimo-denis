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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { useCurrency } from "@/hooks/use-currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusIcon, Pencil, Trash2, User as UserIcon, Camera, Lock, Palette, ArrowRightLeft, Check,
  ShoppingCart, Home, Car, Utensils, HeartPulse, Shirt, GraduationCap, PartyPopper, Wallet,
  PiggyBank, Building, PlugZap, Cable, Gift, Banknote, Wrench, PencilRuler, Baby, Plane, Coffee, Gamepad2, 
  Activity, CreditCard, Folder, Loader2 // Added Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { User, Settings, Category, InsertCategory } from "@shared/schema";

const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  avatarColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  incomeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  expenseColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
});
type ProfileFormData = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
type PasswordFormData = z.infer<typeof passwordFormSchema>;

interface PasswordChangeResponse { // For typing the API response of password change
  message: string;
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  icon: z.string().min(1, "El ícono es obligatorio"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  isIncome: z.boolean(),
});
type CategoryFormData = z.infer<typeof categoryFormSchema>;

export default function SettingsPage() {
  const [defaultCurrencyState, setDefaultCurrencyState] = useState("UYU");
  const [localExchangeRate, setLocalExchangeRate] = useState("38.50");
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
    name: "", icon: "Folder", color: "#6366f1", isIncome: false,
  });
  const [activeCategoriesTab, setActiveCategoriesTab] = useState("gastos");

  const { data: user, isLoading: userLoading } = useQuery<User, Error, User, QueryKey>({
    queryKey: ["/api/user"], queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<Settings, Error, Settings, QueryKey>({
    queryKey: ["/api/settings"], queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: categoriesData = [] as Category[], isLoading: categoriesLoading } = useQuery<Category[], Error, Category[], QueryKey>({
    queryKey: ["/api/categories"], queryFn: getQueryFn({ on401: "throw" }), initialData: [],
  });
  
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", avatarColor: "#6366f1", incomeColor: "#10b981", expenseColor: "#ef4444" },
  });
  
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (settingsData) {
      setDefaultCurrencyState(settingsData.defaultCurrency ?? "UYU");
      setThemeState(settingsData.theme ?? "light");
      setLanguageState(settingsData.language ?? "es");
      const exchangeRateValue = settingsData.exchangeRate ?? globalExchangeRate.toString(); // Use global as fallback
      setLocalExchangeRate(parseFloat(exchangeRateValue).toFixed(2));
    }
  }, [settingsData, globalExchangeRate]);
  
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
    mutationFn: async (data) => apiRequest<Category>("POST", "/api/categories", data),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría creada", description: `La categoría "${newCategory.name}" se ha creado.` });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast({ title: "Error", description: `Error al crear la categoría: ${error.message}`, variant: "destructive" })
  });

  const updateCategoryMutation = useMutation<Category, Error, {id: number; data: Partial<InsertCategory>}>({
    mutationFn: async ({id, data}) => apiRequest<Category>("PUT", `/api/categories/${id}`, data),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría actualizada", description: `La categoría "${updatedCategory.name}" se ha actualizado.` });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la categoría: ${error.message}`, variant: "destructive" })
  });

  const deleteCategoryMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => apiRequest<void>("DELETE", `/api/categories/${id}`), // Expect void for DELETE
    onSuccess: () => { // Data is void, so no parameter here or it's undefined
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría eliminada", description: "La categoría se ha eliminado correctamente" });
    },
    onError: (error) => toast({ title: "Error", description: `Error al eliminar la categoría: ${error.message}`, variant: "destructive" })
  });

  const updateSettingsMutation = useMutation<Settings, Error, Partial<Settings>>({
    mutationFn: async (data) => apiRequest<Settings>("PUT", "/api/settings", data),
    onSuccess: (updatedSettings) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Update local state from server response if needed, e.g. lastExchangeRateUpdate
      if(updatedSettings.exchangeRate) setLocalExchangeRate(parseFloat(updatedSettings.exchangeRate).toFixed(2));
      if(updatedSettings.lastExchangeRateUpdate) { /* update display if needed */ }
      toast({ title: "Configuración actualizada", description: "La configuración se ha guardado." });
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la configuración: ${error.message}`, variant: "destructive" })
  });
  
  const updateProfileMutation = useMutation<User, Error, ProfileFormData>({
    mutationFn: async (data) => apiRequest<User>("PUT", "/api/user", data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Perfil actualizado", description: `Tu perfil, ${updatedUser.name}, se ha actualizado.` });
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar el perfil: ${error.message}`, variant: "destructive" })
  });
  
  const changePasswordMutation = useMutation<PasswordChangeResponse, Error, PasswordFormData>({
    mutationFn: async (data) => apiRequest<PasswordChangeResponse>("PUT", "/api/user/password", data),
    onSuccess: (response) => { // response is PasswordChangeResponse
      toast({ title: "Contraseña actualizada", description: response.message });
      passwordForm.reset();
    },
    onError: (error) => toast({ title: "Error", description: `Error al actualizar la contraseña: ${error.message}`, variant: "destructive" })
  });
  
  const uploadAvatarMutation = useMutation<{ avatar: string }, Error, FormData>({
    mutationFn: async (formData) => { // Not using apiRequest, so types are specific to fetch
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || "Error al subir el avatar"); }
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
    setCategoryFormValues({ name: category.name, icon: category.icon, color: category.color, isIncome: category.isIncome });
    setCategoryDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryFormValues({ name: "", icon: "Folder", color: "#6366f1", isIncome: activeCategoriesTab === "ingresos" });
  };

  const saveSettings = () => {
    if (updateSettingsMutation.isPending) return;
    const formattedRate = parseFloat(localExchangeRate).toFixed(2);
    // setLocalExchangeRate(formattedRate); // Optimistic update, or wait for onSuccess
    // updateGlobalExchangeRate(formattedRate); // Optimistic update
    updateSettingsMutation.mutate({
      defaultCurrency: defaultCurrencyState,
      theme: themeState,
      language: languageState,
      exchangeRate: formattedRate
    });
  };

  const updateExchangeRateOnServer = async () => {
    if (updateSettingsMutation.isPending) return;
    if (!localExchangeRate.trim()) { toast({ title: "Error", description: "Ingresa un tipo de cambio", variant: "destructive" }); return; }
    const numValue = parseFloat(localExchangeRate);
    if (isNaN(numValue)) { toast({ title: "Error", description: "Tipo de cambio inválido", variant: "destructive" }); return; }
    const formattedValue = numValue.toFixed(2);

    updateSettingsMutation.mutate({ // Only sending exchangeRate and last update time related to this action
      exchangeRate: formattedValue,
      lastExchangeRateUpdate: new Date().toISOString(),
      // Send other current settings to prevent them from being wiped if API expects full object
      defaultCurrency: defaultCurrencyState,
      theme: themeState,
      language: languageState,
    });
  };

  const saveCategory = () => {
    const { name, icon, color, isIncome } = categoryFormValues;
    if (!name || !icon || !color) { toast({ title: "Error", description: "Todos los campos son obligatorios", variant: "destructive" }); return; }
    const categoryData: InsertCategory = { name, icon, color, isIncome, parentId: null };
    if (editingCategoryId) {
      updateCategoryMutation.mutate({ id: editingCategoryId, data: categoryData });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };
  
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Error", description: "Imagen grande (max 5MB).", variant: "destructive" }); return; }
    if (!file.type.startsWith("image/")) { toast({ title: "Error", description: "Debe ser una imagen.", variant: "destructive" }); return; }
    const formData = new FormData();
    formData.append("avatar", file);
    uploadAvatarMutation.mutate(formData);
  };
  
  const onPasswordSubmit = (data: PasswordFormData) => changePasswordMutation.mutate(data);
  const onProfileSubmit = (data: ProfileFormData) => updateProfileMutation.mutate(data);

  if (userLoading || settingsLoading || categoriesLoading) {
    return <Shell><div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div></Shell>;
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
              <CardHeader><CardTitle>Configuración General</CardTitle><CardDescription>Opciones básicas de la aplicación.</CardDescription></CardHeader>
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
                  <div className="space-y-0.5"><Label htmlFor="theme">Tema Oscuro</Label><p className="text-sm text-muted-foreground">Alternar tema claro/oscuro.</p></div>
                  <Switch id="theme" checked={themeState === "dark"} onCheckedChange={(checked) => setThemeState(checked ? "dark" : "light")} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tipo de Cambio</CardTitle><CardDescription>USD a UYU.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="exchange-rate">Valor de cambio</Label>
                  <div className="flex space-x-2">
                    <Input id="exchange-rate" type="number" step="0.01" min="0" value={localExchangeRate}
                      onChange={(e) => setLocalExchangeRate(e.target.value)}
                      onBlur={() => {
                        const numValue = parseFloat(localExchangeRate);
                        if (!isNaN(numValue)) setLocalExchangeRate(numValue.toFixed(2));
                        else setLocalExchangeRate(parseFloat(settingsData?.exchangeRate ?? globalExchangeRate.toString()).toFixed(2));
                      }}
                    />
                    <Button onClick={updateExchangeRateOnServer} disabled={updateSettingsMutation.isPending}>
                      {updateSettingsMutation.isPending && updateSettingsMutation.variables?.exchangeRate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Última act.: {settingsData?.lastExchangeRateUpdate ? new Date(settingsData.lastExchangeRateUpdate).toLocaleDateString('es-UY') : 'Nunca'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>Cancelar</Button>
              <Button onClick={saveSettings} disabled={updateSettingsMutation.isPending && !updateSettingsMutation.variables?.exchangeRate}>
                {updateSettingsMutation.isPending && !updateSettingsMutation.variables?.exchangeRate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
              </Button>
            </div>
          </>
        )}
        
        {activeSettingsTab === "perfil" && user && (
          <Card>
            <CardHeader><CardTitle>Mi Perfil</CardTitle><CardDescription>Información personal y preferencias.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      {avatar ? (
                        <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/20">
                          <img src={avatar} alt="Avatar" className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget; target.style.display = 'none';
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
                      <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatarMutation.isPending}>
                        {uploadAvatarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Camera className="h-4 w-4" />}
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
                      <FormField control={profileForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={profileForm.control} name="avatarColor" render={({ field }) => (<FormItem><FormLabel>Color de avatar</FormLabel><FormControl><div className="flex items-center space-x-2"><div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} /><Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>)}/>
                       <FormField control={profileForm.control} name="incomeColor" render={({ field }) => (<FormItem><FormLabel>Color para ingresos</FormLabel><FormControl><div className="flex items-center space-x-2"><div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} /><Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>)}/>
                       <FormField control={profileForm.control} name="expenseColor" render={({ field }) => (<FormItem><FormLabel>Color para gastos</FormLabel><FormControl><div className="flex items-center space-x-2"><div className="h-6 w-6 rounded-full border border-input" style={{ backgroundColor: field.value }} /><Input type="color" {...field} /></div></FormControl><FormMessage /></FormItem>)}/>
                      <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}>{updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}</Button>
                    </form>
                  </Form>
                </div>
                <div className="space-y-6">
                  <Card><CardHeader><CardTitle className="text-lg">Cambiar contraseña</CardTitle></CardHeader><CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Contraseña actual</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Nueva contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar nueva contraseña</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>{changePasswordMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}</Button>
                        </form>
                      </Form>
                  </CardContent></Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeSettingsTab === "categorias" && (
          <Card>
            <CardHeader><CardTitle>Gestión de Categorías</CardTitle><CardDescription>Crea, edita y elimina categorías.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeCategoriesTab} onValueChange={setActiveCategoriesTab}>
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="gastos">Gastos</TabsTrigger><TabsTrigger value="ingresos">Ingresos</TabsTrigger></TabsList>
                <TabsContent value="gastos" className="pt-4">
                  <div className="flex justify-end mb-4"><Button onClick={() => { resetCategoryForm(); setCategoryFormValues(prev => ({...prev, isIncome: false})); setCategoryDialogOpen(true); }}><PlusIcon className="h-4 w-4 mr-2" /> Nueva Categoría</Button></div>
                  <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Icono</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                        {categoriesData.filter((cat) => !cat.isIncome && !cat.isSystem).map((category) => (
                          <TableRow key={category.id}><TableCell>{category.name}</TableCell><TableCell>{category.icon}</TableCell>
                            <TableCell><div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} /></TableCell>
                            <TableCell className="text-right"><div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} disabled={updateCategoryMutation.isPending && editingCategoryId === category.id}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Eliminar "${category.name}"?`)) deleteCategoryMutation.mutate(category.id); }} disabled={deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id}><Trash2 className="h-4 w-4" /></Button>
                            </div></TableCell>
                          </TableRow>))}
                  </TableBody></Table></div>
                </TabsContent>
                <TabsContent value="ingresos" className="pt-4">
                  <div className="flex justify-end mb-4"><Button onClick={() => { resetCategoryForm(); setCategoryFormValues(prev => ({...prev, isIncome: true})); setCategoryDialogOpen(true); }}><PlusIcon className="h-4 w-4 mr-2" /> Nueva Categoría</Button></div>
                  <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Icono</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                        {categoriesData.filter((cat) => cat.isIncome && !cat.isSystem).map((category) => (
                           <TableRow key={category.id}><TableCell>{category.name}</TableCell><TableCell>{category.icon}</TableCell>
                            <TableCell><div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} /></TableCell>
                            <TableCell className="text-right"><div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} disabled={updateCategoryMutation.isPending && editingCategoryId === category.id}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Eliminar "${category.name}"?`)) deleteCategoryMutation.mutate(category.id); }} disabled={deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id}><Trash2 className="h-4 w-4" /></Button>
                            </div></TableCell>
                          </TableRow>))}
                  </TableBody></Table></div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategoryId ? "Editar" : "Nueva"} Categoría</DialogTitle><DialogDescription>{editingCategoryId ? "Modifica detalles." : "Crea una nueva categoría."}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="category-name">Nombre</Label><Input id="category-name" value={categoryFormValues.name} onChange={(e) => setCategoryFormValues(prev => ({...prev, name: e.target.value}))} placeholder="Alimentación"/></div>
            <div className="space-y-2"><Label htmlFor="category-icon">Icono</Label>
              <Select value={categoryFormValues.icon} onValueChange={(value) => setCategoryFormValues(prev => ({...prev, icon: value}))}>
                <SelectTrigger id="category-icon" className="w-full"><SelectValue placeholder="Icono" /></SelectTrigger>
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
            <Button onClick={saveCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>{createCategoryMutation.isPending || updateCategoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}