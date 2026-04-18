"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(value ?? defaultValue ?? "")

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const setValue = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue)
    }
    onValueChange?.(nextValue)
  }

  return (
    <TabsContext.Provider value={{ value: internalValue, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="tabs-list" className={cn("flex flex-wrap gap-2", className)} {...props}>
      {children}
    </div>
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs")
  }

  const isActive = context.value === value

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      aria-selected={isActive}
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm font-medium transition",
        isActive ? "bg-cyan-500 text-black" : "bg-white/5 text-white hover:bg-white/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsContent must be used within Tabs")
  }

  if (context.value !== value) {
    return null
  }

  return (
    <div data-slot="tabs-content" className={cn("flex-1", className)} {...props}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
