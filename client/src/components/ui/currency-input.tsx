import { forwardRef, useState, useEffect } from "react";
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
    const [displayValue, setDisplayValue] = useState("");
    
    // Format initial value
    useEffect(() => {
      if (value === "") {
        setDisplayValue("");
        return;
      }
      
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      
      if (isNaN(numValue)) {
        setDisplayValue("");
        return;
      }
      
      // Just convert to string without forcing decimal formatting
      const formatted = numValue.toString();
      setDisplayValue(formatted);
    }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Allow for empty input
      if (input === "") {
        setDisplayValue("");
        onChange("");
        return;
      }
      
      // Allow only digits and a single decimal point
      const cleanedInput = input.replace(/[^\d.]/g, "");
      
      // Ensure only one decimal point
      const parts = cleanedInput.split(".");
      let formattedValue = parts[0];
      
      if (parts.length > 1) {
        formattedValue += "." + parts.slice(1).join("").slice(0, 2);
      }
      
      setDisplayValue(formattedValue);
      onChange(formattedValue);
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
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            className={cn("pl-10", className)}
            placeholder="0.00"
            {...props}
          />
        </div>
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
