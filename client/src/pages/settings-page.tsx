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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, Pencil, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = useState("UYU");
  const [exchangeRate, setExchangeRate] = useState("38.50");
  const [localExchangeRate, setLocalExchangeRate] = useState("38.50");
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("es");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado para el formulario de categoría
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("Folder");
  const [categoryColor, setCategoryColor] = useState("#6366f1");
  const [categoryIsIncome, setCategoryIsIncome] = useState(false);
  const [activeTab, setActiveTab] = useState("gastos");

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
      // Redondear el valor local si aún tiene decimales
      const roundedValue = Math.round(parseFloat(localExchangeRate)).toString();
      
      // Actualizar el estado local y principal con el valor redondeado
      setLocalExchangeRate(roundedValue);
      setExchangeRate(roundedValue);
      
      updateSettingsMutation.mutate({
        defaultCurrency,
        theme,
        language,
        exchangeRate: roundedValue,
        lastExchangeRateUpdate: new Date().toISOString()
      });
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

  return (
    <Shell>
      <PageHeader
        title="Configuración"
        description="Gestiona las preferencias de tu aplicación"
      />
      
      <div className="grid gap-6">
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
                    // Convertir a entero
                    const inputValue = e.target.value;
                    if (inputValue) {
                      const intValue = Math.round(parseFloat(inputValue)).toString();
                      setLocalExchangeRate(intValue);
                    } else {
                      setLocalExchangeRate("");
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
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => window.location.reload()}>Cancelar</Button>
          <Button onClick={saveSettings}>Guardar Cambios</Button>
        </div>
      </div>

      {/* Modal para crear/editar categorías */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent aria-describedby="category-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {editingCategoryId ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription id="category-dialog-description">
              {editingCategoryId
                ? "Actualiza los detalles de la categoría"
                : "Crea una nueva categoría para organizar tus transacciones"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                placeholder="Ej: Supermercado, Salario, etc."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icono</Label>
              <Input
                id="category-icon"
                placeholder="Nombre del icono"
                value={categoryIcon}
                onChange={(e) => setCategoryIcon(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usa nombres de iconos de Lucide React como "ShoppingCart", "DollarSign", etc.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="category-color"
                  type="color"
                  className="w-16 h-10"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                />
                <Input
                  placeholder="#hex"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="category-is-income"
                checked={categoryIsIncome}
                onCheckedChange={(checked) => setCategoryIsIncome(checked as boolean)}
              />
              <Label htmlFor="category-is-income">Categoría de ingresos</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCategory}>
              {editingCategoryId ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}