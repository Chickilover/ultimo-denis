import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = useState("UYU");
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("es");

  // Obtener la configuración actual
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Actualizar los estados cuando llegan los datos
  useEffect(() => {
    if (settings) {
      setDefaultCurrency(settings.defaultCurrency || "UYU");
      setTheme(settings.theme || "light");
      setLanguage(settings.language || "es");
    }
  }, [settings]);

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
                <input
                  id="exchange-rate"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="38.50"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings?.exchangeRate || "38.50"}
                />
                <Button>Actualizar</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Última actualización: {settings?.lastExchangeRateUpdate ? new Date(settings.lastExchangeRateUpdate).toLocaleDateString('es-UY') : 'Nunca'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline">Cancelar</Button>
          <Button>Guardar Cambios</Button>
        </div>
      </div>
    </Shell>
  );
}