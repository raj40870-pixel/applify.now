import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const badgeClasses: Record<BadgeVariant, string> = {
  default: "bg-cyan-500 text-black",
  secondary: "bg-slate-800 text-white",
  destructive: "bg-red-500/10 text-red-400",
  outline: "border border-white/10 bg-transparent text-white",
  ghost: "bg-white/5 text-white",
  link: "text-cyan-400 underline-offset-2 hover:underline",
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.08em]",
        badgeClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
