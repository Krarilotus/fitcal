"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function formatDateText(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }

  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }

  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }

  return parts.join(".");
}

type DateTextInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  onValueChange?: (value: string) => void;
};

export function DateTextInput({
  defaultValue,
  value,
  onValueChange,
  ...props
}: DateTextInputProps) {
  const [internalValue, setInternalValue] = useState(() =>
    formatDateText(String(defaultValue ?? value ?? "")),
  );

  const isControlled = value != null;
  const displayValue = isControlled ? formatDateText(String(value)) : internalValue;

  return (
    <Input
      {...props}
      inputMode="numeric"
      pattern="\d{2}\.\d{2}\.\d{4}"
      type="text"
      value={displayValue}
      onChange={(event) => {
        const nextValue = formatDateText(event.target.value);

        if (!isControlled) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      }}
    />
  );
}
