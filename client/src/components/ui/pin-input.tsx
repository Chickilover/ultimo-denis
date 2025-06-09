import * as React from "react";

import { cn } from "@/lib/utils";

export interface PinInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> { // Omit onChange and value from standard input props
  length?: number;
  value: string; // Value of the entire pin
  onValueChange?: (value: string) => void; // Renamed from onChange, made optional
  onComplete?: (value: string) => void; // Added value parameter to onComplete
  mask?: boolean;
  // type prop is already part of React.InputHTMLAttributes
}

export function PinInput({
  length = 4,
  value,
  onValueChange, // Destructure onValueChange
  onComplete,
  mask = false,
  className,
  type = "text", // Default type, can be "number", "password", "text"
  ...props // Native input props (excluding onChange, value which are handled)
}: PinInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  // const [focused, setFocused] = React.useState(false); // focused state seems to not be strictly necessary for the core logic if autoFocus logic is simplified

  // Initialize input refs array
  React.useEffect(() => {
    inputRefs.current = Array(length).fill(null).map((_, i) => inputRefs.current[i] || React.createRef<HTMLInputElement>() as any); // Simplified ref initialization
  }, [length]);

  // Auto-focus logic
  React.useEffect(() => {
    // Focus the first empty input or the first input if value is empty
    const focusIndex = value.length < length ? value.length : length - 1;
    if (inputRefs.current[focusIndex]) {
       // inputRefs.current[focusIndex]?.focus(); // Removed auto-focus on value change to prevent issues, focus handled by clicks/tabs
    }
  }, [value, length]); // Removed 'focused' from dependencies

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let digit = e.target.value;
    const currentPinArray = value.split("");

    // For numeric input, allow only numbers (single digit)
    if (type === "number") {
      digit = digit.replace(/[^0-9]/g, "");
    }
    
    // Take only the first char if multiple are entered (except for paste)
    digit = digit.charAt(0);


    if (digit !== "") {
      currentPinArray[index] = digit;
      if (onValueChange) {
        onValueChange(currentPinArray.join("").slice(0, length));
      }
      // Auto-advance to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    
    // Check if all inputs are filled
    const newPinValue = currentPinArray.join("").slice(0, length);
    if (newPinValue.length === length && onComplete) {
      onComplete(newPinValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length - value.length + (value[0] ? 0 : 1) ); // Limit paste to available length
    let currentPinArray = value.split("");
    let currentFocusIndex = value.length;

    // Determine starting index for pasting (current focused or first empty)
    const activeElement = document.activeElement as HTMLInputElement;
    const activeIndex = inputRefs.current.findIndex(ref => ref === activeElement);
    currentFocusIndex = activeIndex !== -1 ? activeIndex : currentFocusIndex;


    for (let i = 0; i < pastedData.length; i++) {
        if (currentFocusIndex + i < length) {
            let charToPaste = pastedData[i];
            if (type === "number" && isNaN(Number(charToPaste))) {
                continue; // Skip non-numeric if type is number
            }
            currentPinArray[currentFocusIndex + i] = charToPaste;
        }
    }
    
    const newPinValue = currentPinArray.join("").slice(0, length);
    if (onValueChange) {
        onValueChange(newPinValue);
    }

    const nextFocusIndex = Math.min(length -1, currentFocusIndex + pastedData.length);
    inputRefs.current[nextFocusIndex]?.focus();

    if (newPinValue.length === length && onComplete) {
        onComplete(newPinValue);
    }
  };


  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const currentPinArray = value.split("");
      currentPinArray[index] = ""; // Clear current or previous if current is already empty

      if (value[index]) { // If current input had a value, clear it
        currentPinArray[index] = "";
      } else if (index > 0) { // If current is empty, clear previous and move focus
        currentPinArray[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }
      if (onValueChange) {
        onValueChange(currentPinArray.join("").slice(0, length));
      }
    } else if (e.key === "ArrowLeft") {
      if (index > 0) inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight") {
      if (index < length - 1) inputRefs.current[index + 1]?.focus();
    }
    // Other keys are handled by handleInputChange via the input's onChange
  };

  const valueArray = value.padEnd(length, " ").split("").slice(0, length); // Ensure valueArray always has 'length' items

  return (
    <div
      className={cn("flex gap-2", className)}
      // Removed onFocus/onBlur from container as individual inputs handle focus
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type={mask && type !== "password" ? "password" : type === "number" ? "tel" : "text"} // Use "tel" for numeric to get numpad, password for mask
          inputMode={type === "number" ? "numeric" : "text"}
          value={valueArray[index]?.trim() || ""} // Use trimmed value or empty string
          onChange={(e) => handleInputChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste} // Added paste handler
          onFocus={(e) => e.target.select()} // Select all text on focus
          className={cn(
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
            // mask && valueArray[index] && "mask-pin" // Masking handled by type="password"
            props.disabled && "cursor-not-allowed opacity-50"
          )}
          maxLength={1} // Each input takes only one character
          autoComplete="off" // Changed from "one-time-code" as it can interfere
          disabled={props.disabled}
          // {...props} // Spreading all props can be risky, explicitly pass needed ones like 'disabled', 'name', etc.
          // id, name, disabled, readOnly, required are common and safe to spread from ...props
          id={props.id ? `${props.id}-${index}` : undefined}
          name={props.name ? `${props.name}-${index}` : undefined}
          readOnly={props.readOnly}
          required={props.required}
          aria-label={`Pin digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
