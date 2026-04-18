import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
