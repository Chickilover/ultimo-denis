import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Este componente gestiona la instalación de la PWA
export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Guardar el evento beforeinstallprompt para usarlo después
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Evitar que Chrome muestre la instalación automáticamente
      e.preventDefault();
      // Guardar el evento para poder activarlo después
      setInstallPrompt(e);
      setShowInstallButton(true);
    };

    // Escuchamos el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

    // Limpiar el event listener
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  // Función para instalar la aplicación
  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }

    // Mostrar el prompt de instalación
    installPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await installPrompt.userChoice;
    
    // Analizar la respuesta del usuario
    if (outcome === 'accepted') {
      toast({
        title: "¡Instalación completada!",
        description: "Gracias por instalar Nido Financiero en tu dispositivo."
      });
    } else {
      toast({
        title: "Instalación cancelada",
        description: "Puedes instalar la aplicación más tarde desde el menú."
      });
    }

    // No volvemos a mostrar el botón en esta sesión
    setShowInstallButton(false);
    setInstallPrompt(null);
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstallClick}
      variant="outline"
      className="flex items-center gap-2 text-primary border-primary/30 bg-primary/5"
    >
      <Download size={16} />
      <span>Instalar App</span>
    </Button>
  );
}