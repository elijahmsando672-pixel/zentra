import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export function DemoDataBadge({ className, label = "Sample data" }: { className?: string; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 border-dashed border-info/40 bg-info-soft/60 text-info cursor-help",
            className
          )}
        >
          <Info className="size-3" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Some records and figures may be illustrative. Check transaction and payment statuses for current details.
      </TooltipContent>
    </Tooltip>
  );
}
