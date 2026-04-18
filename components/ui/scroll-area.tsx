import * as React from "react"

import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("overflow-auto rounded-3xl p-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollArea }
