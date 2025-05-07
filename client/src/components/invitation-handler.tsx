import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface InvitationHandlerProps {
  invitationCode: string;
}

export function InvitationHandler({ invitationCode }: InvitationHandlerProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    inviter?: {
      id: number;
      username: string;
      name: string;
    };
    householdId?: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Mutation para validar la invitación
  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/invitations/validate", { code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al validar la invitación");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setIsValidating(false);
    },
    onError: (error: Error) => {
      setIsValidating(false);
      toast({
        title: "Error al validar invitación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para aceptar la invitación
  const acceptMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/invitations/accept", { code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al aceptar la invitación");
      }
      return response.json();
    },
    onSuccess: () => {
      // Actualizar la información del usuario después de aceptar la invitación
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "¡Te has unido al hogar!",
        description: "Ahora formas parte del hogar familiar",
      });
      
      // Redirigir a la página de familia después de aceptar
      navigate("/family");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al aceptar invitación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verificar la invitación al cargar el componente
  useEffect(() => {
    if (invitationCode) {
      validateMutation.mutate(invitationCode);
    }
  }, [invitationCode]);

  // Si el usuario no está autenticado, mostrar mensaje para iniciar sesión
  if (!user) {
    return (
      <Alert className="my-4">
        <AlertTitle>Invitación de hogar detectada</AlertTitle>
        <AlertDescription>
          Has recibido una invitación para unirte a un hogar. Por favor, inicia sesión o regístrate para continuar.
        </AlertDescription>
      </Alert>
    );
  }

  // Si está validando, mostrar cargando
  if (isValidating || validateMutation.isPending) {
    return (
      <Alert className="my-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <AlertTitle>Validando invitación...</AlertTitle>
        <AlertDescription>
          Estamos verificando la validez del código de invitación.
        </AlertDescription>
      </Alert>
    );
  }

  // Si la invitación no es válida
  if (!validationResult?.valid) {
    return (
      <Alert className="my-4" variant="destructive">
        <XCircle className="h-4 w-4 mr-2" />
        <AlertTitle>Invitación inválida</AlertTitle>
        <AlertDescription>
          El código de invitación no es válido o ha expirado. Por favor, solicita una nueva invitación.
        </AlertDescription>
      </Alert>
    );
  }

  // Si está aceptando la invitación
  if (acceptMutation.isPending) {
    return (
      <Alert className="my-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <AlertTitle>Uniéndote al hogar...</AlertTitle>
        <AlertDescription>
          Estamos procesando tu solicitud para unirte al hogar.
        </AlertDescription>
      </Alert>
    );
  }

  // Si la invitación es válida pero aún no se ha aceptado
  return (
    <Alert className="my-4">
      <CheckCircle2 className="h-4 w-4 mr-2" />
      <AlertTitle>Invitación válida</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>
          Has sido invitado por <strong>{validationResult.inviter?.name || validationResult.inviter?.username}</strong> para unirte a su hogar.
        </p>
        <Button 
          onClick={() => acceptMutation.mutate(invitationCode)}
          className="w-full sm:w-auto"
        >
          Aceptar invitación
        </Button>
      </AlertDescription>
    </Alert>
  );
}