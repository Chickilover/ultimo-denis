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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusIcon, 
  Pencil, 
  Trash2, 
  User, 
  Camera, 
  Lock, 
  Palette, 
  ArrowRightLeft,
  Check 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Esquema para actualizar perfil
const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  avatarColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  incomeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
  expenseColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal válido"),
})

// Esquema para cambiar contraseña
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export default function SettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = useState("UYU");
  const [exchangeRate, setExchangeRate] = useState("38.50");
  const [localExchangeRate, setLocalExchangeRate] = useState("38.50");
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("es");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para la sección de perfil
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  
  // Función para cambiar directamente a la pestaña de perfil
  const showProfileTab = () => {
    setActiveSettingsTab("perfil");
  };
  const [avatar, setAvatar] = useState<string | null>(null);

  // Estado para el formulario de categoría
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("Folder");
  const [categoryColor, setCategoryColor] = useState("#6366f1");
  const [categoryIsIncome, setCategoryIsIncome] = useState(false);
  const [activeTab, setActiveTab] = useState("gastos");

  // Obtener el usuario actual
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Obtener la configuración actual
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Obtener categorías
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Formulario de perfil
  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      avatarColor: "#6366f1",
      incomeColor: "#10b981",
      expenseColor: "#ef4444",
    },
  });
  
  // Formulario de cambio de contraseña
  const passwordForm = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Actualizar los estados cuando llegan los datos
  useEffect(() => {
    if (settings) {
      setDefaultCurrency(settings.defaultCurrency || "UYU");
      setTheme(settings.theme || "light");
      setLanguage(settings.language || "es");
      
      // Redondear el tipo de cambio a un entero
      const exchangeRateValue = settings.exchangeRate || "38";
      const roundedValue = Math.round(parseFloat(exchangeRateValue)).toString();
      
      setExchangeRate(roundedValue);
      setLocalExchangeRate(roundedValue);
    }
  }, [settings]);
  
  // Actualizar formulario de perfil cuando los datos de usuario llegan
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        avatarColor: user.avatarColor || "#6366f1",
        incomeColor: user.incomeColor || "#10b981",
        expenseColor: user.expenseColor || "#ef4444",
      });
      
      if (user.avatar) {
        setAvatar(user.avatar);
      }
    }
  }, [user, profileForm]);

  // Mutations para la gestión de categorías
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría creada",
        description: "La categoría se ha creado correctamente"
      });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al crear la categoría: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/categories/${editingCategoryId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría se ha actualizado correctamente"
      });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al actualizar la categoría: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al eliminar la categoría: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutación para actualizar configuración
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración se ha actualizado correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al actualizar la configuración: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutación para actualizar perfil de usuario
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Perfil actualizado",
        description: "Tu perfil se ha actualizado correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al actualizar el perfil: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutación para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user/password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha actualizado correctamente"
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al actualizar la contraseña: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutación para subir avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al subir el avatar");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setAvatar(data.avatar);
      toast({
        title: "Avatar actualizado",
        description: "Tu avatar se ha actualizado correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al subir el avatar: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Función para abrir el modal de categoría en modo edición
  const handleEditCategory = (category: any) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryColor(category.color);
    setCategoryIsIncome(category.isIncome);
    setCategoryDialogOpen(true);
  };

  // Función para resetear el formulario de categoría
  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryIcon("Folder");
    setCategoryColor("#6366f1");
    setCategoryIsIncome(activeTab === "ingresos");
  };

  // Función para guardar cambios de configuración
  const saveSettings = () => {
    if (!updateSettingsMutation.isPending) {
      // Redondear el tipo de cambio a un entero
      const roundedValue = Math.round(parseFloat(localExchangeRate)).toString();
      
      // Actualizar el estado local y principal con el valor redondeado
      setLocalExchangeRate(roundedValue);
      setExchangeRate(roundedValue);
      
      updateSettingsMutation.mutate({
        defaultCurrency,
        theme,
        language,
        exchangeRate: roundedValue
      });
    }
  };

  // Función para actualizar el tipo de cambio
  const updateExchangeRate = () => {
    if (!updateSettingsMutation.isPending) {
      try {
        // Asegurar que tenemos un valor para procesar
        if (!localExchangeRate || localExchangeRate.trim() === "") {
          toast({
            title: "Error",
            description: "Por favor ingresa un valor para el tipo de cambio",
            variant: "destructive"
          });
          return;
        }
        
        // Convertir a número y redondear al entero más cercano
        const numValue = parseFloat(localExchangeRate);
        if (isNaN(numValue)) {
          toast({
            title: "Error",
            description: "El valor del tipo de cambio debe ser un número válido",
            variant: "destructive"
          });
          return;
        }
        
        // Redondear siempre a un número entero
        const roundedValue = Math.round(numValue).toString();
        
        // Actualizar estado local
        setLocalExchangeRate(roundedValue);
        setExchangeRate(roundedValue);
        
        // Datos a enviar al servidor
        const now = new Date();
        
        // Enviar al servidor - Incluir solo el exchangeRate para evitar conflictos
        updateSettingsMutation.mutate({
          exchangeRate: roundedValue,
          // Establecer fecha en formato compatible con PostgreSQL
          lastExchangeRateUpdate: now.toISOString(),
          // Mantener las demás configuraciones para no perderlas
          defaultCurrency,
          theme,
          language
        });
      } catch (err) {
        console.error("Error al actualizar tipo de cambio:", err);
        toast({
          title: "Error",
          description: "Ocurrió un error al actualizar el tipo de cambio",
          variant: "destructive"
        });
      }
    }
  };

  // Función para guardar una categoría
  const saveCategory = () => {
    const categoryData = {
      name: categoryName,
      icon: categoryIcon,
      color: categoryColor,
      isIncome: categoryIsIncome
    };

    if (editingCategoryId) {
      if (!updateCategoryMutation.isPending) {
        updateCategoryMutation.mutate(categoryData);
        setCategoryDialogOpen(false);
      }
    } else {
      if (!createCategoryMutation.isPending) {
        createCategoryMutation.mutate(categoryData);
        setCategoryDialogOpen(false);
      }
    }
  };
  
  // Función para manejar la subida de avatar
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tamaño y tipo
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen es demasiado grande. El tamaño máximo es 5MB.",
        variant: "destructive"
      });
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen.",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("avatar", file);
    
    uploadAvatarMutation.mutate(formData);
  };
  
  // Función para cambiar contraseña
  const onPasswordSubmit = (data: z.infer<typeof passwordFormSchema>) => {
    if (!changePasswordMutation.isPending) {
      changePasswordMutation.mutate(data);
    }
  };
  
  // Función para actualizar perfil
  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    if (!updateProfileMutation.isPending) {
      updateProfileMutation.mutate(data);
    }
  };

  return (
    <Shell>
      <PageHeader
        title="Configuración"
        description="Gestiona las preferencias de tu aplicación"
      />
      
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
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>
                  Configura las opciones básicas de tu aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda predeterminada</Label>
                  <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UYU">Peso Uruguayo (UYU)</SelectItem>
                      <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language" className="w-full">
                      <SelectValue placeholder="Selecciona idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Tema Oscuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Cambiar entre el tema claro y oscuro
                    </p>
                  </div>
                  <Switch 
                    id="theme" 
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificaciones</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar notificaciones para recordatorios
                    </p>
                  </div>
                  <Switch id="notifications" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Cambio</CardTitle>
                <CardDescription>
                  Actualiza el tipo de cambio para convertir entre monedas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="exchange-rate">Dólar Estadounidense (USD) a Peso Uruguayo (UYU)</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="exchange-rate"
                      placeholder="38"
                      type="number"
                      step="1"  
                      min="0"
                      value={localExchangeRate}
                      onChange={(e) => {
                        // Permitir entrada vacía o valores numéricos
                        const inputValue = e.target.value;
                        
                        if (inputValue === "") {
                          // Permitir campo vacío durante la edición
                          setLocalExchangeRate("");
                        } else {
                          // Intentar convertir a número
                          const numValue = parseFloat(inputValue);
                          if (!isNaN(numValue)) {
                            // Siempre guardar como entero
                            const intValue = Math.round(numValue).toString();
                            setLocalExchangeRate(intValue);
                          }
                        }
                      }}
                      onBlur={() => {
                        // Si el campo está vacío al perder el foco, restaurar el valor anterior
                        if (localExchangeRate === "") {
                          setLocalExchangeRate(exchangeRate);
                        }
                      }}
                    />
                    <Button onClick={updateExchangeRate}>Actualizar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Última actualización: {settings?.lastExchangeRateUpdate ? new Date(settings.lastExchangeRateUpdate).toLocaleDateString('es-UY') : 'Nunca'}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>Cancelar</Button>
              <Button onClick={saveSettings}>Guardar Cambios</Button>
            </div>
          </>
        )}
        
        {activeSettingsTab === "perfil" && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Perfil</CardTitle>
              <CardDescription>
                Actualiza tu información personal y preferencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      {avatar ? (
                        <div className="h-24 w-24 rounded-full overflow-hidden">
                          <img 
                            src={avatar} 
                            alt="Avatar" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="h-24 w-24 rounded-full flex items-center justify-center text-xl font-semibold text-white"
                          style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
                        >
                          {user?.name?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Tu nombre" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <FormField
                          control={profileForm.control}
                          name="avatarColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color de avatar</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="h-6 w-6 rounded-full border border-input" 
                                    style={{ backgroundColor: field.value }}
                                  />
                                  <Input type="color" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <FormField
                          control={profileForm.control}
                          name="incomeColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color para ingresos</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="h-6 w-6 rounded-full border border-input" 
                                    style={{ backgroundColor: field.value }}
                                  />
                                  <Input type="color" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <FormField
                          control={profileForm.control}
                          name="expenseColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color para gastos</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="h-6 w-6 rounded-full border border-input" 
                                    style={{ backgroundColor: field.value }}
                                  />
                                  <Input type="color" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </form>
                  </Form>
                </div>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contraseña actual</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nueva contraseña</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar nueva contraseña</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={changePasswordMutation.isPending}
                          >
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
            <CardHeader>
              <CardTitle>Gestión de Categorías</CardTitle>
              <CardDescription>
                Crea, edita y elimina categorías para organizar tus transacciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gastos">Categorías de Gastos</TabsTrigger>
                  <TabsTrigger value="ingresos">Categorías de Ingresos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="gastos" className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => {
                        resetCategoryForm();
                        setCategoryIsIncome(false);
                        setCategoryDialogOpen(true);
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nueva Categoría
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Icono</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories
                          .filter((category: any) => !category.isIncome && !category.isSystem)
                          .map((category: any) => (
                            <TableRow key={category.id}>
                              <TableCell>{category.name}</TableCell>
                              <TableCell>{category.icon}</TableCell>
                              <TableCell>
                                <div 
                                  className="h-4 w-4 rounded-full" 
                                  style={{ backgroundColor: category.color }} 
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditCategory(category)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(`¿Estás seguro que deseas eliminar la categoría "${category.name}"?`)) {
                                        deleteCategoryMutation.mutate(category.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="ingresos" className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => {
                        resetCategoryForm();
                        setCategoryIsIncome(true);
                        setCategoryDialogOpen(true);
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nueva Categoría
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Icono</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories
                          .filter((category: any) => category.isIncome && !category.isSystem)
                          .map((category: any) => (
                            <TableRow key={category.id}>
                              <TableCell>{category.name}</TableCell>
                              <TableCell>{category.icon}</TableCell>
                              <TableCell>
                                <div 
                                  className="h-4 w-4 rounded-full" 
                                  style={{ backgroundColor: category.color }} 
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditCategory(category)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(`¿Estás seguro que deseas eliminar la categoría "${category.name}"?`)) {
                                        deleteCategoryMutation.mutate(category.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
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
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {editingCategoryId 
                ? "Modifica los detalles de la categoría existente" 
                : "Crea una nueva categoría para organizar tus transacciones"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input 
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Alimentación"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icono</Label>
              <Input 
                id="category-icon"
                value={categoryIcon}
                onChange={(e) => setCategoryIcon(e.target.value)}
                placeholder="ShoppingCart"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <Input 
                id="category-color"
                type="color"
                value={categoryColor}
                onChange={(e) => setCategoryColor(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="category-is-income" 
                checked={categoryIsIncome}
                onCheckedChange={(checked) => setCategoryIsIncome(!!checked)}
              />
              <Label htmlFor="category-is-income">Es categoría de ingresos</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}