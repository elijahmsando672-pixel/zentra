import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
  /** Hide this column on mobile card layout (default keeps it) */
  hideOnMobile?: boolean;
  /** Used as the card title on mobile */
  primary?: boolean;
  /** Used as the secondary line on mobile */
  secondary?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
  mobileCard,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  mobileCard?: (row: T, index: number) => React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (isMobile) {
    if (mobileCard) {
      return (
        <div className={cn("space-y-3", className)}>
          {rows.map((row, i) => (
            <div key={keyExtractor(row, i)}>{mobileCard(row, i)}</div>
          ))}
        </div>
      );
    }
    const primaryCol = columns.find((c) => c.primary) ?? columns[0];
    const secondaryCol = columns.find((c) => c.secondary);
    const restCols = columns.filter((c) => c !== primaryCol && c !== secondaryCol && !c.hideOnMobile);
    return (
      <div className={cn("space-y-3", className)}>
        {rows.map((row, i) => (
          <div
            key={keyExtractor(row, i)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "rounded-lg border border-border bg-card p-4 shadow-xs",
              onRowClick && "cursor-pointer transition-colors hover:border-primary/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{primaryCol.render(row, i)}</div>
                {secondaryCol && (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {secondaryCol.render(row, i)}
                  </div>
                )}
              </div>
              {restCols.slice(0, 1).map((col) => (
                <div key={col.key} className="shrink-0 text-right">
                  {col.render(row, i)}
                </div>
              ))}
            </div>
            {restCols.length > 1 && (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                {restCols.slice(1).map((col) => (
                  <div key={col.key} className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {col.header}
                    </p>
                    <div className="mt-0.5 truncate text-sm">{col.render(row, i)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-xs", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={keyExtractor(row, i)}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(row, i)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
