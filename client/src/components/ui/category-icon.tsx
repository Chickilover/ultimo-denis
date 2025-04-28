import React from "react";
import {
  Banknote,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Coffee,
  HeartPulse,
  School,
  Plane,
  Shirt,
  Gamepad2,
  Film,
  Gift,
  Briefcase,
  PiggyBank,
  CreditCard,
  Receipt,
  Phone,
  Smartphone,
  Wallet
} from "lucide-react";

// Mapeo de iconos categorizados por tipo
const iconMap: Record<string, React.ReactNode> = {
  // Iconos para ingresos
  "Banknote": <Banknote />,
  "Wallet": <Wallet />,
  "Briefcase": <Briefcase />,
  "PiggyBank": <PiggyBank />,
  
  // Iconos para gastos
  "ShoppingCart": <ShoppingCart />,
  "Home": <Home />,
  "Car": <Car />,
  "Utensils": <Utensils />,
  "Coffee": <Coffee />,
  "HeartPulse": <HeartPulse />,
  "School": <School />,
  "Plane": <Plane />,
  "Shirt": <Shirt />,
  "Gamepad2": <Gamepad2 />,
  "Film": <Film />,
  "Gift": <Gift />,
  "CreditCard": <CreditCard />,
  "Receipt": <Receipt />,
  "Phone": <Phone />,
  "Smartphone": <Smartphone />
};

// Mapeo de emojis para categorías
const emojiMap: Record<string, string> = {
  // Ingresos
  "Ingresos": "💰",
  "Salario": "💼",
  "Freelance": "💻",
  "Honorarios": "📝",
  "Ventas": "🏷️",
  "Regalo Recibido": "🎁",
  "Inversiones": "📈",
  "Bonos": "🎯",
  "Otros Ingresos": "💵",
  
  // Gastos por categoría
  "Alimentación": "🍽️",
  "Supermercado": "🛒",
  "Restaurantes": "🍴",
  "Comida Rápida": "🍔",
  "Café": "☕",
  
  "Vivienda": "🏠",
  "Alquiler": "🔑",
  "Hipoteca": "🏦",
  "Luz": "💡",
  "Agua": "💧",
  "Gas": "🔥",
  "Internet": "🌐",
  "Cable": "📺",
  "Mantenimiento": "🔨",
  
  "Transporte": "🚗",
  "Combustible": "⛽",
  "Transporte Público": "🚌",
  "Taxi/Uber": "🚕",
  "Peajes": "🛣️",
  "Estacionamiento": "🅿️",
  "Mantenimiento Vehículo": "🔧",
  
  "Salud": "⚕️",
  "Médicos": "👩‍⚕️",
  "Dentista": "🦷",
  "Medicamentos": "💊",
  "Seguros de Salud": "🩺",
  "Gimnasio": "🏋️",
  
  "Educación": "📚",
  "Matrículas": "🎓",
  "Libros": "📖",
  "Cursos": "🧠",
  "Material Escolar": "✏️",
  
  "Entretenimiento": "🎭",
  "Cine": "🎬",
  "Conciertos": "🎵",
  "Streaming": "📺",
  "Juegos": "🎮",
  "Salidas": "🎪",
  
  "Viajes": "✈️",
  "Hoteles": "🏨",
  "Vuelos": "🛩️",
  "Excursiones": "🧳",
  "Alquiler de Vehículos": "🚙",
  
  "Ropa": "👕",
  "Calzado": "👟",
  "Accesorios Personales": "👜",
  
  "Tecnología": "💻",
  "Teléfono e Internet": "📱",
  "Computadoras": "🖥️",
  "Gadgets": "🎧",
  "Software": "📊",
  
  "Mascotas": "🐾",
  "Alimento para Mascotas": "🦴",
  "Veterinario": "🐈",
  "Accesorios para Mascotas": "🐕",
  
  "Regalos Dados": "🎁",
  "Donaciones": "❤️",
  "Suscripciones": "📧",
  
  // Tarjetas y deudas
  "Tarjetas": "💳",
  "Préstamos": "💸",
  "Deudas": "📉",
  
  // Genéricos
  "Otros Gastos": "📋",
  "Varios": "🔄",
  
  // Categoría desconocida
  "default": "📊"
};

interface CategoryIconProps {
  name: string;
  icon?: string;
  className?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showEmoji?: boolean;
}

export function CategoryIcon({
  name,
  icon,
  className = "",
  color,
  size = "md",
  showEmoji = true
}: CategoryIconProps) {
  // Determinar el tamaño de la fuente para el emoji
  const emojiSizeClass = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }[size];
  
  // Determinar el tamaño del ícono
  const iconSizeClass = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }[size];
  
  // Si se ha forzado solo mostrar emojis o si existe un emoji para la categoría
  if (showEmoji && (emojiMap[name] || !icon)) {
    return (
      <span 
        className={`${emojiSizeClass} ${className}`}
        style={color ? { color } : {}}
      >
        {emojiMap[name] || emojiMap["default"]}
      </span>
    );
  }
  
  // Intentar renderizar un ícono de Lucide
  const IconComponent = icon && iconMap[icon];
  if (IconComponent) {
    return (
      <span 
        className={`${className} text-${color || "primary"}`}
      >
        {React.cloneElement(IconComponent as React.ReactElement, { 
          className: `${iconSizeClass} ${className}`,
          style: color ? { color } : {}
        })}
      </span>
    );
  }
  
  // Fallback a una letra inicial si no hay ícono ni emoji
  return (
    <div 
      className={`
        ${iconSizeClass} 
        bg-primary/20 
        rounded-full 
        flex 
        items-center 
        justify-center 
        text-primary
        ${className}
      `}
      style={color ? { backgroundColor: `${color}30`, color } : {}}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}