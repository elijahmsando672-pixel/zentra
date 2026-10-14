"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, QrCode, RefreshCw } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { getMpesaQr } from "@/lib/services/deposits";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/utils";

export function MpesaQrPanel({
  amount,
  tillNumber,
  merchantName,
}: {
  amount: number;
  tillNumber: string;
  merchantName: string;
}) {
  const enabled = amount > 0 && Boolean(tillNumber.trim());
  const qr = useApiQuery(["mpesa-qr", amount], () => getMpesaQr(amount), {
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!enabled) return null;

  if (qr.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Preparing your scan-to-pay QR…
      </div>
    );
  }

  const data = qr.data;
  if (!data?.available || !data.image) return null;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/40 p-4 text-center sm:flex-row sm:text-left">
      <Image
        src={data.image}
        alt="M-Pesa scan-to-pay QR code"
        width={160}
        height={160}
        unoptimized
        className="shrink-0 rounded-md border border-border bg-white p-2"
      />
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm font-bold sm:justify-start">
          <QrCode className="size-4" />
          Or scan to pay
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Scan this with the M-Pesa app to pay {formatKES(amount)} to {merchantName}. Till{" "}
          <span className="numeric font-semibold">{tillNumber}</span>.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void qr.refetch()}>
          <RefreshCw />
          Refresh QR
        </Button>
      </div>
    </div>
  );
}
