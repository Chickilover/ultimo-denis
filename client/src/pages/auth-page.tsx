import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Lock, 
  Users,
  LinkIcon,
  CheckCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from "@/components/ui/alert";

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Usuario o correo electrónico requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const registerSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  isAdmin: z.boolean().optional().default(true),
  invitationCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "El token es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La confirmación de contraseña es requerida"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"], 
});

const invitationSchema = z.object({
  code: z.string().min(1, "El código de invitación es requerido"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type InvitationFormValues = z.infer<typeof invitationSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>("");
  const [showInvitation, setShowInvitation] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [invitationData, setInvitationData] = useState<{
    valid: boolean;
    inviter?: { 
      id: number; 
      username: string; 
      name: string; 
      email: string;
    }
  } | null>(null);
  const [invitationLoading, setInvitationLoading] = useState<boolean>(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState<boolean>(false);
  const { toast } = useToast();

  // Invitación por código
  const invitationForm = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      code: "",
    },
  });

  // Extraer el código de invitación de la URL si existe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invitation");
    if (code) {
      setInvitationCode(code);
      invitationForm.setValue("code", code);
      validateInvitationCode(code);
      setShowInvitation(true);
    }
  }, []);

  // Función para validar un código de invitación
  const validateInvitationCode = async (code: string) => {
    if (!code) return;

    try {
      setInvitationLoading(true);
      const response = await apiRequest("POST", "/api/invitations/validate", { code });
      const result = await response.json();
      
      if (response.ok && result.valid) {
        setInvitationData(result);
      } else {
        setInvitationData(null);
        toast({
          title: "Código inválido",
          description: "El código de invitación es inválido o ha expirado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setInvitationData(null);
      toast({
        title: "Error",
        description: "Ocurrió un error al validar la invitación.",
        variant: "destructive",
      });
    } finally {
      setInvitationLoading(false);
    }
  };

  // Función para manejar el envío del formulario de invitación
  const onInvitationSubmit = (data: InvitationFormValues) => {
    validateInvitationCode(data.code);
  };

  // Función para aceptar la invitación
  const acceptInvitation = async () => {
    if (!invitationData?.valid || !invitationCode) return;

    try {
      setAcceptingInvitation(true);
      const response = await apiRequest("POST", "/api/invitations/accept", { code: invitationCode });
      
      if (response.ok) {
        toast({
          title: "Invitación aceptada",
          description: "Has sido añadido al hogar correctamente.",
          variant: "default",
        });
        // Actualizar el usuario e ir a la página principal
        window.location.href = "/";
      } else {
        toast({
          title: "Error",
          description: "No se pudo procesar la invitación.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la invitación.",
        variant: "destructive",
      });
    } finally {
      setAcceptingInvitation(false);
    }
  };

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      isAdmin: true,
      invitationCode: "",
    },
  });

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Submit handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      const result = await response.json();
      
      toast({
        title: "Solicitud enviada",
        description: "Si tu correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
        variant: "default",
      });

      // En un entorno de desarrollo, mostrar el token para pruebas
      if (result.token) {
        setResetToken(result.token);
        setShowResetPassword(true);
        setShowForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar tu solicitud.",
        variant: "destructive",
      });
    }
  };

  const onResetPasswordSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await apiRequest("POST", "/api/reset-password", {
        token: data.token || resetToken,
        password: data.password
      });
      
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión.",
        variant: "default",
      });
      
      setShowResetPassword(false);
      setActiveTab("login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar tu contraseña. El token puede ser inválido o haber expirado.",
        variant: "destructive",
      });
    }
  };

  // Renderizar formulario para recuperar contraseña
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-2 top-2 flex items-center text-gray-500"
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
              <div className="pt-4">
                <CardTitle className="text-center">Recuperar contraseña</CardTitle>
                <CardDescription className="text-center">
                  Ingresa tu correo electrónico para recibir instrucciones
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={forgotPasswordForm.control}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full mt-2"
                  >
                    Enviar instrucciones
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Renderizar formulario para restablecer contraseña
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-2 top-2 flex items-center text-gray-500"
                onClick={() => {
                  setShowResetPassword(false);
                  setActiveTab("login");
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
              <div className="pt-4">
                <CardTitle className="text-center">Crear nueva contraseña</CardTitle>
                <CardDescription className="text-center">
                  Ingresa tu nueva contraseña
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                  {!resetToken && (
                    <FormField
                      control={resetPasswordForm.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token de recuperación</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ingresa el token recibido" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={resetPasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full mt-2"
                  >
                    Cambiar contraseña
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Renderizar página de invitación
  if (showInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-2 top-2 flex items-center text-gray-500"
                onClick={() => {
                  setShowInvitation(false);
                  setInvitationCode("");
                  setInvitationData(null);
                  invitationForm.reset();
                  setActiveTab("login");
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
              <div className="pt-4">
                <CardTitle className="text-center">Invitación a Mi Hogar</CardTitle>
                <CardDescription className="text-center">
                  Ingresa o confirma el código de invitación
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!invitationData?.valid ? (
                <Form {...invitationForm}>
                  <form onSubmit={invitationForm.handleSubmit(onInvitationSubmit)} className="space-y-4">
                    <FormField
                      control={invitationForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de invitación</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ingresa el código recibido" 
                              {...field} 
                              disabled={invitationLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={invitationLoading}
                    >
                      {invitationLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando...
                        </>
                      ) : "Validar Invitación"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <>
                  <Alert className="bg-primary/10 border-primary/20">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <AlertTitle>Invitación válida</AlertTitle>
                    <AlertDescription>
                      Has recibido una invitación para unirte al hogar 
                      {invitationData.inviter ? ` de ${invitationData.inviter.name}` : ""}.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="rounded-lg border p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Detalles de la invitación</h3>
                      </div>
                      {invitationData.inviter && (
                        <div className="space-y-1 ml-7">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Invitado por:</span> {invitationData.inviter.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Email:</span> {invitationData.inviter.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Si aceptas esta invitación, te unirás al hogar y podrás compartir gastos y finanzas con los miembros.
                    </p>
                    
                    {!user ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Necesitas iniciar sesión para aceptar la invitación</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowInvitation(false);
                              setActiveTab("login");
                            }}
                            className="w-full"
                          >
                            Iniciar Sesión
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowInvitation(false);
                              setActiveTab("register");
                            }}
                            className="w-full"
                          >
                            Registrarse
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={acceptInvitation}
                        disabled={acceptingInvitation}
                        className="w-full"
                      >
                        {acceptingInvitation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : "Aceptar Invitación"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 max-w-4xl w-full shadow-lg rounded-lg overflow-hidden">
        {/* Hero Section */}
        <div className="bg-primary text-white p-8 hidden lg:flex flex-col justify-between relative overflow-hidden">
          <div className="z-10 relative">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/images/logo.png" 
                alt="Nido Financiero Logo" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-center">Nido Financiero</h1>
            <p className="text-lg opacity-90 text-center">
              Gestiona las finanzas de tu hogar de manera inteligente y colaborativa
            </p>
          </div>
          {/* Background semi-transparent logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <img 
              src="/images/logo.png" 
              alt="Background Logo" 
              className="w-64 h-64 object-contain"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Registra ingresos y gastos en pesos uruguayos o dólares</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Crea presupuestos y metas de ahorro compartidas con tu familia</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Visualiza informes detallados para mejorar tus finanzas</p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col items-center mb-6">
              <div className="flex justify-center mb-3">
                <img 
                  src="/images/logo.png" 
                  alt="Nido Financiero Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                Nido Financiero
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Gestiona las finanzas de tu hogar de manera simple y efectiva
              </p>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register" className="flex-1">Registrarse</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder a tu hogar financiero
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario o correo electrónico</FormLabel>
                            <FormControl>
                              <Input placeholder="usuario o correo@ejemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Iniciar Sesión
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                    ¿No tienes una cuenta?{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto" 
                      onClick={() => setActiveTab("register")}
                    >
                      Regístrate
                    </Button>
                  </div>
                  <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto" 
                      onClick={() => setShowForgotPassword(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Crear una cuenta</CardTitle>
                  <CardDescription>
                    Ingresa tus datos para crear tu hogar financiero
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
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
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="usuario" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Registrarse
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                    ¿Ya tienes una cuenta?{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto" 
                      onClick={() => setActiveTab("login")}
                    >
                      Inicia sesión
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
