import { forwardRef, useState, useEffect } from "react";
import { Input, InputProps } from "./input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps extends Omit<InputProps, "onChange"> {
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
      
      // Format number with comma as decimal separator (Uruguayan format)
      const formatted = numValue.toLocaleString("es-UY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      
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
      
      // Remove all non-numeric characters except comma
      const cleanedInput = input.replace(/[^\d,]/g, "");
      
      // Allow only one comma
      const parts = cleanedInput.split(",");
      let formattedValue = parts[0];
      
      if (parts.length > 1) {
        formattedValue += "," + parts.slice(1).join("").slice(0, 2);
      }
      
      setDisplayValue(formattedValue);
      
      // Convert to standard numeric format for the onChange handler
      // Replace comma with dot for standard decimal handling
      const standardized = formattedValue.replace(",", ".");
      onChange(standardized);
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
            {...props}
          />
        </div>
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
