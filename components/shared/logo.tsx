import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" fill="#071426" />
      <path
        d="M9 9.5h14v3.4l-8.6 6.2H23v3.4H9v-3.4l8.6-6.2H9V9.5Z"
        fill="#C8F24A"
      />
      <circle cx="24" cy="8.5" r="2.2" fill="#F5B942" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  light = false,
}: {
  className?: string;
  markClassName?: string;
  light?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          "text-lg font-extrabold tracking-tight",
          light ? "text-white" : "text-brand-deep dark:text-white"
        )}
      >
        Zentra
      </span>
    </span>
  );
}
