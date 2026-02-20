"use client"

/**
 * Switch — lightweight toggle component
 *
 * Matches the existing Radix UI component pattern used across the project
 * (shadcn/ui style). Pure CSS implementation using a checkbox under the hood
 * so no additional Radix dependency is needed.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          checked ? "bg-primary" : "bg-input",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
