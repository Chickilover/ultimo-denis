import { Shell } from "@/components/layout/shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertCircle, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import logoImage from "@/assets/logo.jpg";

export default function ScannerPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<null | {
    fecha: string;
    monto: string;
    comercio: string;
    categoria: string;
  }>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato no soportado",
        description: "Por favor, sube una imagen (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      
      // Simular procesamiento
      setIsProcessing(true);
      
      setTimeout(() => {
        setIsProcessing(false);
        setShowResults(true);
        
        // Datos simulados de reconocimiento
        setResults({
          fecha: new Date().toLocaleDateString('es-ES'),
          monto: "1,250.00",
          comercio: "Supermercado El Dorado",
          categoria: "Alimentos"
        });
      }, 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTransaction = () => {
    toast({
      title: "Transacción creada",
      description: "Se ha creado una nueva transacción a partir del recibo",
      variant: "default"
    });
    
    // Restablecer el estado
    setSelectedImage(null);
    setShowResults(false);
    setResults(null);
  };

  return (
    <Shell>
      <PageHeader
        title="Escáner de Recibos"
        description="Escanea tus recibos para crear transacciones automáticamente"
        actions={
          <Button onClick={handleUploadClick} variant="default" className="bg-primary hover:bg-primary/90">
            <Upload className="mr-2 h-4 w-4" />
            Subir Imagen
          </Button>
        }
      />
      
      <div className="grid gap-6">
        {!selectedImage ? (
          <div className="border rounded-lg p-8 text-center bg-card/50">
            <div className="mx-auto mb-4 flex justify-center">
              <img src={logoImage} alt="Logo" className="h-16 w-auto opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-2">Escanea tus recibos</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Sube una foto clara de tu recibo o factura para extraer automáticamente los datos y crear una transacción.
            </p>
            <Button onClick={handleUploadClick} variant="default" size="lg" className="bg-primary hover:bg-primary/90">
              <Upload className="mr-2 h-4 w-4" />
              Seleccionar Imagen
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Imagen Cargada</CardTitle>
                <CardDescription>Previsualización del recibo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={selectedImage} 
                    alt="Recibo" 
                    className="w-full h-auto object-contain max-h-[400px]"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => {
                  setSelectedImage(null);
                  setResults(null);
                  setShowResults(false);
                }}>
                  Cancelar
                </Button>
                <Button 
                  variant="default"
                  className="bg-primary hover:bg-primary/90"
                  disabled={isProcessing}
                  onClick={() => {
                    if (!isProcessing && !showResults) {
                      setIsProcessing(true);
                      setTimeout(() => {
                        setIsProcessing(false);
                        setShowResults(true);
                        setResults({
                          fecha: new Date().toLocaleDateString('es-ES'),
                          monto: "1,250.00",
                          comercio: "Supermercado El Dorado",
                          categoria: "Alimentos"
                        });
                      }, 2500);
                    }
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : showResults ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Procesado
                    </>
                  ) : (
                    'Procesar Imagen'
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>Datos extraídos del recibo</CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-center text-muted-foreground">
                      Analizando la imagen y extrayendo información...
                    </p>
                  </div>
                ) : !showResults ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground">
                      Haz clic en "Procesar Imagen" para comenzar la extracción de datos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm">Fecha</h4>
                      <div className="bg-muted p-3 rounded-md">
                        {results?.fecha}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm">Comercio</h4>
                      <div className="bg-muted p-3 rounded-md">
                        {results?.comercio}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm">Monto</h4>
                      <div className="bg-muted p-3 rounded-md font-medium">
                        ${results?.monto}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm">Categoría Detectada</h4>
                      <div className="bg-muted p-3 rounded-md">
                        {results?.categoria}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-secondary hover:bg-secondary/90 text-white" 
                  disabled={!showResults}
                  onClick={handleCreateTransaction}
                >
                  Crear Transacción
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Modals and dialogs can be added here if needed */}
    </Shell>
  );
}