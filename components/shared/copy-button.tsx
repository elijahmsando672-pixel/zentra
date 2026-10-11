"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, copyText } from "@/lib/utils";
import { toast } from "sonner";

export function CopyButton({
  value,
  label = "Copy",
  className,
  variant = "ghost",
  size = "icon-sm",
  onCopied,
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  onCopied?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await copyText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    onCopied?.();
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {size === "default" && (copied ? "Copied" : label)}
    </Button>
  );
}
