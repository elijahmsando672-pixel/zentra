"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function FilterSheet({
  title = "Filters",
  description,
  triggerLabel = "Filters",
  activeCount = 0,
  onReset,
  children,
  className,
  footer,
}: {
  title?: string;
  description?: string;
  triggerLabel?: string;
  activeCount?: number;
  onReset?: () => void;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const trigger = (
    <Button variant="outline" size={isMobile ? "sm" : "default"} className="relative cursor-pointer">
      <SlidersHorizontal />
      {triggerLabel}
      {activeCount > 0 && (
        <Badge variant="default" className="ml-1 size-5 justify-center rounded-full p-0">
          {activeCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("gap-0", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-5 flex-1 space-y-5 overflow-y-auto">{children}</div>
        <SheetFooter className="mt-6 border-t border-border pt-4">
          {footer ?? (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onReset?.();
                }}
              >
                Reset
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
