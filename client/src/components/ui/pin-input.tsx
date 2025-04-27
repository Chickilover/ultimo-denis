import * as React from "react";

import { cn } from "@/lib/utils";

export interface PinInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  mask?: boolean;
}

export function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  mask = false,
  className,
  type = "text",
  ...props
}: PinInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = React.useState(false);

  // Initialize input refs array with the correct length
  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
    while (inputRefs.current.length < length) {
      inputRefs.current.push(null);
    }
  }, [length]);

  // Auto-focus on first empty input or the last one
  React.useEffect(() => {
    if (focused) {
      const emptyIndex = value.split("").findIndex((v, i) => v === "");
      const focusIndex = emptyIndex === -1 ? length - 1 : emptyIndex;
      const input = inputRefs.current[value.length < length ? value.length : length - 1];
      input?.focus();
    }
  }, [value, focused, length]);

  // Handle input change
  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let digit = e.target.value;
    
    // If backspace/delete pressed but the input is not empty, clear the current box
    if (digit === "" && value[index]) {
      const newValue = value.split("");
      newValue[index] = "";
      onChange(newValue.join(""));
      return;
    }
    
    // Handle pasting multiple digits
    if (digit.length > 1) {
      // Take only what we need from the pasted content
      const newValue = value.split("");
      const pastedChars = digit.split("");
      
      for (let i = index; i < length && pastedChars.length > 0; i++) {
        const nextChar = pastedChars.shift();
        if (nextChar && (type !== "number" || !isNaN(Number(nextChar)))) {
          newValue[i] = nextChar;
        }
      }
      
      const newPinValue = newValue.join("");
      onChange(newPinValue);
      
      // Check if all inputs are filled after pasting
      if (newPinValue.length === length && onComplete) {
        onComplete();
      }
      
      return;
    }
    
    // For numeric input, allow only numbers
    if (type === "number" && digit !== "" && isNaN(Number(digit))) {
      return;
    }
    
    // Regular single digit input
    if (digit !== "" && index < length) {
      const newValue = value.split("");
      newValue[index] = digit.charAt(0);
      const newPinValue = newValue.join("");
      onChange(newPinValue);
      
      // Auto-advance to next input
      if (index < length - 1 && digit !== "") {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Check if all inputs are filled
      if (newPinValue.length === length && onComplete) {
        onComplete();
      }
    }
  };

  // Handle keydown for navigation and deletion
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      if ((e.target as HTMLInputElement).value === "") {
        // Move to previous input when backspace/delete is pressed on an empty input
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          
          // Clear the previous input
          const newValue = value.split("");
          newValue[index - 1] = "";
          onChange(newValue.join(""));
        }
      }
    } else if (e.key === "ArrowLeft") {
      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle focus on container
  const handleContainerFocus = () => {
    setFocused(true);
    const emptyIndex = value.split("").findIndex((v, i) => !v);
    const focusIndex = emptyIndex === -1 ? length - 1 : emptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  // Handle blur on container
  const handleContainerBlur = (e: React.FocusEvent) => {
    // Only blur if the focus is leaving the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFocused(false);
    }
  };

  // Split the current value into individual digits
  const valueArray = value.split("").concat(Array(length - value.length).fill(""));

  return (
    <div
      className={cn("flex gap-2", className)}
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
      tabIndex={-1}
    >
      {Array.from({ length }, (_, index) => (
        <div key={index} className="relative">
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type={type}
            inputMode={type === "number" ? "numeric" : "text"}
            value={valueArray[index] || ""}
            onChange={(e) => handleInputChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              "w-10 h-14 text-center text-lg font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
              mask && valueArray[index] && "mask-pin"
            )}
            autoComplete="off"
            {...props}
          />
        </div>
      ))}
    </div>
  );
}
