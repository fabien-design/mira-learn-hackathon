"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 duration-200",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-card text-card-foreground shadow-lg",
          "transition-transform duration-300 ease-in-out",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          side === "right" && [
            "inset-y-0 right-0 h-full w-4/5 max-w-sm border-l border-rule",
            "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
          ],
          side === "left" && [
            "inset-y-0 left-0 h-full w-4/5 max-w-sm border-r border-rule",
            "data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full",
          ],
          side === "top" && [
            "inset-x-0 top-0 border-b border-rule",
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          ],
          side === "bottom" && [
            "inset-x-0 bottom-0 border-t border-rule",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          ],
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-beige-deep hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-mira-red/30"
        >
          <XIcon className="h-4 w-4" strokeWidth={1.8} />
          <span className="sr-only">Fermer</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-6 pb-4 pt-5", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold text-charcoal", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
}
