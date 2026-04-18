"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface AccordionContextValue {
  isOpen: boolean
  toggle: () => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

function Accordion({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="accordion" className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {children}
    </div>
  )
}

function AccordionItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isOpen, setIsOpen] = React.useState(false)

  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <AccordionContext.Provider value={{ isOpen, toggle }}>
      <div data-slot="accordion-item" className={cn("border border-white/10 rounded-3xl overflow-hidden", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("AccordionTrigger must be used within an AccordionItem")
  }

  return (
    <button
      type="button"
      data-slot="accordion-trigger"
      onClick={context.toggle}
      className={cn(
        "flex w-full items-center justify-between gap-3 bg-white/5 px-4 py-3 text-left text-sm font-medium transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70",
        className
      )}
      {...props}
    >
      {children}
      {context.isOpen ? (
        <ChevronUpIcon className="size-4" />
      ) : (
        <ChevronDownIcon className="size-4" />
      )}
    </button>
  )
}

function AccordionContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("AccordionContent must be used within an AccordionItem")
  }

  return context.isOpen ? (
    <div
      data-slot="accordion-content"
      className={cn("px-4 pb-4 text-sm text-slate-400", className)}
      {...props}
    >
      {children}
    </div>
  ) : null
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
