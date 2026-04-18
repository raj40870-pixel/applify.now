import * as React from "react"

import { cn } from "@/lib/utils"

type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"

type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg"

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-cyan-500 text-black hover:bg-cyan-400",
  outline: "border border-white/10 bg-transparent hover:bg-white/5 text-white",
  secondary: "bg-slate-700 text-white hover:bg-slate-600",
  ghost: "bg-transparent hover:bg-white/5 text-white",
  destructive: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
  link: "bg-transparent text-cyan-400 underline-offset-4 hover:underline",
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4",
  xs: "h-8 px-2.5 text-xs",
  sm: "h-9 px-3 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0",
  "icon-xs": "h-8 w-8 p-0",
  "icon-sm": "h-9 w-9 p-0",
  "icon-lg": "h-12 w-12 p-0",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
