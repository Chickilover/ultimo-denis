import { forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export interface CurrencyInputProps extends Omit<ComponentProps<"input">, "onChange"> {
  value: string | number;
  onChange: (value: string) => void;
  currency?: "UYU" | "USD";
  label?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = "UYU", className, label, ...props }, ref) => {
    // Format the display value directly without using state
    const getDisplayValue = () => {
      if (value === "" || value === undefined || value === null) {
        return "";
      }
      
      // If it's already a string, use it directly
      if (typeof value === "string") {
        return value;
      }
      
      // Convert number to string
      return value.toString();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Allow for empty input
      if (input === "") {
        onChange("");
        return;
      }
      
      // Solo permitir dígitos (sin puntos decimales)
      const cleanedInput = input.replace(/[^\d]/g, "");
      
      // No necesitamos manejar decimales ya que solo usamos enteros
      onChange(cleanedInput);
    };
    
    return (
      <div className="relative">
        {label && (
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </div>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
            {currency === "UYU" ? "$U" : "US$"}
          </div>
          <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={getDisplayValue()}
            onChange={handleChange}
            className={cn("pl-10", className)}
            placeholder="0"
            {...props}
          />
        </div>
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
