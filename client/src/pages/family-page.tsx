import { ShellWithoutTransaction } from "@/components/layout/shell-without-transaction";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/providers/app-provider";
import { WebSocketMessageType } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, PlusCircle, Trash2, User, Users, Mail, Copy, Link as LinkIcon, CheckCircle, Clock, AlertCircle, Wallet } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import { HouseholdCreationDialog } from "@/components/household-creation-dialog";
import { InvitationManagement } from "@/components/invitation-management";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BalanceSection } from "@/components/balance";
import { Textarea } from "@/components/ui/textarea";

// Schema para validar los datos del formulario
const familyMemberSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido").optional(),
  relationship: z.string().min(1, "La relación es obligatoria"),
  canAccess: z.boolean().default(false),
  avatarUrl: z.string().nullable().optional(),
});

// Esquema para el formulario de hogar
const householdSchema = z.object({
  name: z.string().min(1, "El nombre del hogar es obligatorio"),
});

// Esquema para el formulario de invitación
const invitationSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es obligatorio"),
});

// Esquema para unirse a un hogar usando código
const joinHouseholdSchema = z.object({
  code: z.string().min(1, "El código de invitación es obligatorio"),
});

type FamilyMember = {
  id: number;
  name: string;
  email?: string; // Campo opcional para email
  relationship: string;
  isActive: boolean;
  canAccess: boolean;
  avatarUrl: string | null;
  createdAt: string;
  userId: number;
};

// Interfaz para las invitaciones
type Invitation = {
  code: string;
  username: string;
  expires: string;
  householdId: number | null;
};

export default function FamilyPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateHouseholdDialogOpen, setIsCreateHouseholdDialogOpen] = useState(false);
  const [isJoinHouseholdDialogOpen, setIsJoinHouseholdDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [activeTab, setActiveTab] = useState("household");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [invitationMessage, setInvitationMessage] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { isWebSocketConnected, lastMessages } = useApp();
  const { user } = useAuth();
  
  // Obtener la lista de miembros familiares
  const { data: familyMembers, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/family-members');
      if (!response.ok) throw new Error('Error al obtener los miembros de la familia');
      return response.json();
    }
  });
  
  // Obtener invitaciones enviadas
  const { data: invitations, isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/invitations');
      if (!response.ok) throw new Error('Error al obtener las invitaciones');
      return response.json();
    }
  });
  
  // Obtener invitaciones recibidas
  const { data: receivedInvitations, isLoading: isLoadingReceivedInvitations } = useQuery({
    queryKey: ['/api/received-invitations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/received-invitations');
      if (!response.ok) throw new Error('Error al obtener las invitaciones recibidas');
      return response.json();
    }
  });
  
  // Mutation para crear un nuevo miembro familiar
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof familyMemberSchema>) => {
      const response = await apiRequest('POST', '/api/family-members', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear el miembro familiar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro añadido",
        description: "El miembro familiar ha sido añadido correctamente."
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para actualizar un miembro familiar
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number, 
      data: z.infer<typeof familyMemberSchema> 
    }) => {
      const response = await apiRequest('PUT', `/api/family-members/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar el miembro familiar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro actualizado",
        description: "El miembro familiar ha sido actualizado correctamente."
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para eliminar un miembro familiar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/family-members/${id}`);
      if (!response.ok) {
        throw new Error('Error al eliminar el miembro familiar');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro eliminado",
        description: "El miembro familiar ha sido eliminado correctamente."
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
  
  // Form para añadir miembro
  const addForm = useForm<z.infer<typeof familyMemberSchema>>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      relationship: "",
      canAccess: false,
      avatarUrl: null,
    },
  });
  
  // Form para editar miembro
  const editForm = useForm<z.infer<typeof familyMemberSchema>>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      relationship: "",
      canAccess: false,
      avatarUrl: null,
    },
  });
  
  // Form para invitar
  const inviteForm = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      username: "",
    },
  });
  
  // Form para crear hogar
  const createHouseholdForm = useForm<z.infer<typeof householdSchema>>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Form para unirse a un hogar con código
  const joinHouseholdForm = useForm<z.infer<typeof joinHouseholdSchema>>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: {
      code: "",
    },
  });
  
  // Mutation para crear hogar
  const createHouseholdMutation = useMutation({
    mutationFn: async (data: z.infer<typeof householdSchema>) => {
      const response = await apiRequest('POST', '/api/households', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear el hogar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Hogar creado",
        description: "Se ha creado tu hogar correctamente."
      });
      setIsCreateHouseholdDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para unirse a un hogar
  const joinHouseholdMutation = useMutation({
    mutationFn: async (data: z.infer<typeof joinHouseholdSchema>) => {
      const response = await apiRequest('POST', '/api/invitations/accept', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al unirse al hogar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Te has unido a un hogar",
        description: "Ahora formas parte de este hogar."
      });
      setIsJoinHouseholdDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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
  
  // Función para abrir el modal de edición
  const handleEditMember = (member: FamilyMember) => {
    setSelectedMember(member);
    editForm.reset({
      name: member.name,
      email: member.email || "", // Si existe email, lo usamos
      relationship: member.relationship,
      canAccess: member.canAccess,
      avatarUrl: member.avatarUrl,
    });
    setIsEditDialogOpen(true);
  };
  
  // Función para manejar el envío del formulario de añadir
  const onAddSubmit = (data: z.infer<typeof familyMemberSchema>) => {
    createMutation.mutate(data);
  };
  
  // Función para manejar el envío del formulario de edición
  const onEditSubmit = (data: z.infer<typeof familyMemberSchema>) => {
    if (selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    }
  };
  
  // Función para eliminar un miembro
  const handleDeleteMember = (id: number) => {
    deleteMutation.mutate(id);
  };
  
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
  
  // Función para crear un hogar
  const onCreateHouseholdSubmit = (data: z.infer<typeof householdSchema>) => {
    createHouseholdMutation.mutate(data);
  };
  
  // Función para unirse a un hogar con código
  const onJoinHouseholdSubmit = (data: z.infer<typeof joinHouseholdSchema>) => {
    joinHouseholdMutation.mutate(data);
  };
  
  // Función para generar mensaje de texto para invitación
  const generateTextMessage = () => {
    if (invitationCode) {
      const msg = `¡Hola! Te invito a unirte a mi grupo familiar en Nido Financiero. Usa este código de invitación: ${invitationCode} o visita este enlace: ${invitationLink}`;
      setInvitationMessage(msg);
      return msg;
    }
    return "";
  };
  
  // Función para copiar mensaje de texto al portapapeles
  const copyTextMessageToClipboard = () => {
    const msg = generateTextMessage();
    if (msg) {
      navigator.clipboard.writeText(msg);
      toast({
        title: "Mensaje copiado",
        description: "El mensaje de invitación ha sido copiado al portapapeles."
      });
    }
  };
  
  // Formatear fecha de expiración
  const formatExpireDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };
  
  return (
    <ShellWithoutTransaction>
      <PageHeader
        title="Mi Hogar"
        description="Administra los miembros de tu familia o grupo de convivencia"
        actions={
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Añadir Miembro</span>
                  <span className="sm:hidden">Añadir</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Miembro Familiar</DialogTitle>
                  <DialogDescription>
                    Añade un miembro a tu familia. Los miembros pueden representar personas que no usan directamente la aplicación.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relación</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Esposo/a, Hijo/a, Padre, etc." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="ejemplo@correo.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Opcional: Permite enviar notificaciones al miembro.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="canAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Tiene cuenta en la aplicación
                            </FormLabel>
                            <FormDescription>
                              Marcar si este miembro usará la aplicación directamente.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Invitar Usuario</span>
                  <span className="sm:hidden">Invitar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
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
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de usuario</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="usuario123" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Ingresa el nombre de usuario registrado.
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
                      
                      <div className="mb-3">
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
                      
                      <div>
                        <Label>Mensaje para enviar por SMS</Label>
                        <div className="mt-1.5">
                          <Textarea 
                            ref={messageRef}
                            value={invitationMessage || generateTextMessage()} 
                            readOnly 
                            rows={3}
                            className="font-sm resize-none"
                          />
                          <div className="flex justify-end mt-2">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={copyTextMessageToClipboard}
                              className="w-full"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar mensaje para SMS
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Comparte este código, enlace o mensaje de texto con la persona a la que quieres invitar. El código será válido por 7 días.
                    </p>
                    
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setInvitationCode(null);
                          setInvitationLink(null);
                          setInvitationMessage(null);
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
          </div>
        }
      />

      {/* Notificaciones de WebSocket para invitaciones */}
      {isWebSocketConnected && lastMessages.some(msg => 
        msg.type === WebSocketMessageType.INVITATION_CREATED || msg.type === WebSocketMessageType.INVITATION_ACCEPTED
      ) && (
        <div className="mb-6">
          <Alert variant="default" className="bg-primary/10 border-primary/30">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle>Notificaciones en tiempo real</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {lastMessages.filter(msg => msg.type === WebSocketMessageType.INVITATION_CREATED).map((msg, i) => (
                  <div key={`invite-created-${i}`} className="flex items-center text-sm">
                    <Badge variant="secondary" className="mr-2 bg-primary/20 text-primary hover:bg-primary/30">Nueva</Badge>
                    <span>Has recibido una invitación de <strong>{msg.payload?.inviter?.username}</strong></span>
                  </div>
                ))}
                {lastMessages.filter(msg => msg.type === WebSocketMessageType.INVITATION_ACCEPTED).map((msg, i) => (
                  <div key={`invite-accepted-${i}`} className="flex items-center text-sm">
                    <Badge variant="secondary" className="mr-2 bg-green-500/20 text-green-700 hover:bg-green-500/30">Aceptada</Badge>
                    <span><strong>{msg.payload?.username}</strong> ha aceptado tu invitación</span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/invitations'] })}
              >
                Refrescar datos
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <Tabs defaultValue="household" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="household">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mi Hogar</span>
            <span className="sm:hidden">Hogar</span>
          </TabsTrigger>
          <TabsTrigger value="members">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Miembros</span>
            <span className="sm:hidden">Miembros</span>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Invitaciones</span>
            <span className="sm:hidden">Invitar</span>
          </TabsTrigger>
          <TabsTrigger value="balance">
            <Wallet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Balances</span>
            <span className="sm:hidden">Balance</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="household" className="space-y-4">
          {user?.householdId ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mi Hogar</CardTitle>
                  <CardDescription>Información sobre tu hogar y opciones para gestionarlo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Hogar #{user.householdId}</h3>
                        <p className="text-sm text-muted-foreground">Miembro activo</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setIsInviteDialogOpen(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Invitar miembros
                      </Button>
                      
                      <Button
                        onClick={() => setActiveTab("members")}
                        variant="outline"
                        className="gap-2"
                      >
                        <User className="h-4 w-4" />
                        Ver miembros
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Invitaciones</CardTitle>
                    <CardDescription>Gestiona las invitaciones a tu hogar</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoadingInvitations ? (
                      <div className="animate-pulse h-16 bg-muted rounded-md" />
                    ) : invitations && invitations.length > 0 ? (
                      <div className="text-sm">
                        Tienes {invitations.length} invitación(es) activa(s)
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-sm" 
                          onClick={() => setActiveTab("invitations")}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm">No tienes invitaciones activas</div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setIsInviteDialogOpen(true)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar invitación
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Balances</CardTitle>
                    <CardDescription>Revisa los balances de tu familia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setActiveTab("balance")}
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Ver balances
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 border rounded-lg space-y-4">
              <div className="rounded-full bg-muted p-4 mb-2">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-center">Aún no tienes un hogar</h3>
              <p className="text-center text-muted-foreground max-w-md">
                Crea un hogar para gestionar los miembros de tu familia y compartir gastos.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                <Dialog open={isCreateHouseholdDialogOpen} onOpenChange={setIsCreateHouseholdDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Users className="mr-2 h-4 w-4" />
                      Crear un hogar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear un Hogar</DialogTitle>
                      <DialogDescription>
                        Crea tu propio hogar para invitar a miembros de tu familia
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...createHouseholdForm}>
                      <form onSubmit={createHouseholdForm.handleSubmit(onCreateHouseholdSubmit)} className="space-y-4 pt-4">
                        <FormField
                          control={createHouseholdForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del hogar</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Mi hogar" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Elige un nombre para identificar tu hogar
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createHouseholdMutation.isPending}
                          >
                            {createHouseholdMutation.isPending ? "Creando..." : "Crear hogar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isJoinHouseholdDialogOpen} onOpenChange={setIsJoinHouseholdDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Unirse con código
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unirse a un Hogar</DialogTitle>
                      <DialogDescription>
                        Ingresa el código de invitación que recibiste
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...joinHouseholdForm}>
                      <form onSubmit={joinHouseholdForm.handleSubmit(onJoinHouseholdSubmit)} className="space-y-4 pt-4">
                        <FormField
                          control={joinHouseholdForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de invitación</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ingresa el código" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                El código debe ser provisto por un miembro del hogar
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={joinHouseholdMutation.isPending}
                          >
                            {joinHouseholdMutation.isPending ? "Uniéndose..." : "Unirse al hogar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-muted"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-3 w-20 bg-muted rounded"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted rounded"></div>
                      <div className="h-3 w-4/5 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <div className="h-9 w-9 bg-muted rounded"></div>
                    <div className="h-9 w-9 bg-muted rounded"></div>
                  </CardFooter>
                </Card>
              ))
            ) : familyMembers && familyMembers.length > 0 ? (
              familyMembers.map((member) => (
                <Card key={member.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>{member.relationship}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Mail className="h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {member.isActive && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                          Activo
                        </Badge>
                      )}
                      {member.canAccess && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                          Acceso a la Aplicación
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar miembro</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Eliminarás al miembro <span className="font-medium">{member.name}</span> de tu familia.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-1">Sin miembros familiares</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Aún no has añadido ningún miembro a tu familia. Añade miembros para gestionar mejor tus finanzas compartidas.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Miembro
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="invitations" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Invitaciones</h3>
            {user?.householdId && (
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Nueva Invitación
              </Button>
            )}
          </div>
          
          {/* Nuestro nuevo componente de gestión de invitaciones */}
          <InvitationManagement 
            sentInvitations={invitations}
            receivedInvitations={receivedInvitations}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
              queryClient.invalidateQueries({ queryKey: ['/api/received-invitations'] });
            }}
            isLoading={isLoadingInvitations || isLoadingReceivedInvitations}
          />
          
          {(!invitations || invitations.length === 0) && 
           (!receivedInvitations || receivedInvitations.length === 0) && 
           !isLoadingInvitations && !isLoadingReceivedInvitations && (
            <div className="mt-6 flex justify-center">
              {user?.householdId ? (
                <Button 
                  onClick={() => setIsInviteDialogOpen(true)}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Invitar a alguien
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsJoinHouseholdDialogOpen(true)}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Ingresar código de invitación
                </Button>
              )}
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
        
        <TabsContent value="balance" className="space-y-4">
          <BalanceSection />
        </TabsContent>
      </Tabs>
      
      {/* Modal para editar miembro */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Miembro Familiar</DialogTitle>
            <DialogDescription>
              Modifica los datos del miembro familiar.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del miembro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
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
                      Para enviar invitaciones si este miembro tendrá acceso a la aplicación.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Padre, Madre, Hijo, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="canAccess"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Permitir Acceso</FormLabel>
                      <FormDescription>
                        ¿Permitir que este miembro pueda acceder a la aplicación?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Actualizando..." : "Actualizar Miembro"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ShellWithoutTransaction>
  );
}