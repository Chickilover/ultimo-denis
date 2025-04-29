import { ShellWithoutTransaction } from "@/components/layout/shell-without-transaction";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Users, Mail, Copy, Link as LinkIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";

// Esquema para el formulario de invitación
const invitationSchema = z.object({
  email: z.string().email("Correo electrónico inválido").min(1, "El correo electrónico es obligatorio"),
});

// Interfaz para las invitaciones
type Invitation = {
  code: string;
  email: string;
  expires: string;
  householdId: number | null;
};

export default function AccountsPage() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invitations");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Obtener invitaciones activas
  const { data: invitations, isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/invitations');
      if (!response.ok) throw new Error('Error al obtener las invitaciones');
      return response.json();
    }
  });
  
  // Form para invitar
  const inviteForm = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Mutation para crear invitación
  const createInvitationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invitationSchema>) => {
      const response = await apiRequest('POST', '/api/invitations', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear la invitación');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setInvitationCode(data.code);
      setInvitationLink(data.link);
      toast({
        title: "Invitación creada",
        description: "Se ha generado un código de invitación."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Función para copiar el código al portapapeles
  const copyCodeToClipboard = () => {
    if (invitationCode) {
      navigator.clipboard.writeText(invitationCode);
      toast({
        title: "Código copiado",
        description: "El código de invitación ha sido copiado al portapapeles."
      });
    }
  };
  
  // Función para copiar el enlace al portapapeles
  const copyLinkToClipboard = () => {
    if (linkRef.current) {
      linkRef.current.select();
      document.execCommand('copy');
      toast({
        title: "Enlace copiado",
        description: "El enlace de invitación ha sido copiado al portapapeles."
      });
    }
  };
  
  // Función para enviar el formulario de invitación
  const onInviteSubmit = (data: z.infer<typeof invitationSchema>) => {
    createInvitationMutation.mutate(data);
  };
  
  // Formatear fecha de expiración
  const formatExpireDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };
  
  return (
    <ShellWithoutTransaction>
      <PageHeader
        title="Invitaciones"
        description="Administra invitaciones para compartir gastos con tu hogar"
        actions={
          <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Invitar Usuario
          </Button>
        }
      />

      <Tabs defaultValue="invitations" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="invitations">
            <Mail className="h-4 w-4 mr-2" />
            Invitaciones
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="invitations" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Invitaciones Enviadas</h3>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Nueva Invitación
            </Button>
          </div>
          
          {isLoadingInvitations ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-40 bg-muted rounded"></div>
                  </div>
                  <div className="h-8 w-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : invitations && invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <Card key={invitation.code}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" /> 
                        Expira: {formatExpireDate(invitation.expires)}
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(invitation.code);
                              setCopiedCode(invitation.code);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                          >
                            {copiedCode === invitation.code ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Código</span>
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copiar código de invitación</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center border rounded-lg">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-1">Sin invitaciones enviadas</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                No has enviado ninguna invitación aún. Invita a miembros de tu familia a unirse a tu hogar.
              </p>
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Invitación
              </Button>
            </div>
          )}
          
          <div className="mt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Información</AlertTitle>
              <AlertDescription>
                Las invitaciones son válidas por 7 días. Puedes generar nuevos códigos de invitación si los actuales expiran.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Modal de invitación */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar a un Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación a un usuario para unirse a tu hogar.
            </DialogDescription>
          </DialogHeader>
          
          {!invitationCode ? (
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="correo@ejemplo.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        La invitación será enviada a este correo electrónico.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createInvitationMutation.isPending}
                  >
                    {createInvitationMutation.isPending ? "Generando..." : "Generar Invitación"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="rounded-md bg-muted p-4">
                <div className="mb-3">
                  <Label>Código de invitación</Label>
                  <div className="flex mt-1.5">
                    <Input 
                      value={invitationCode} 
                      readOnly 
                      className="font-mono"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="ml-2"
                            onClick={copyCodeToClipboard}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copiar código</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div>
                  <Label>Enlace de invitación</Label>
                  <div className="flex mt-1.5">
                    <Input 
                      ref={linkRef}
                      value={invitationLink || ""} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="ml-2"
                            onClick={copyLinkToClipboard}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copiar enlace</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Comparte este código o enlace con la persona a la que quieres invitar. El código será válido por 7 días.
              </p>
              
              <DialogFooter>
                <Button
                  onClick={() => {
                    setInvitationCode(null);
                    setInvitationLink(null);
                    inviteForm.reset();
                    setIsInviteDialogOpen(false);
                  }}
                >
                  Listo
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ShellWithoutTransaction>
  );
}