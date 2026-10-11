import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-gradient-to-r from-muted via-muted/60 to-muted animate-shimmer bg-[length:200%_100%] rounded-md",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
