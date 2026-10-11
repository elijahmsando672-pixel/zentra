"use client";

import type { ReactNode } from "react";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/constants";
import { useApiQuery } from "@/hooks/use-api";
import { getPublicPaymentConfig } from "@/lib/services/deposits";
import { formatPhoneKE, normalizePhoneKE } from "@/lib/utils";

export function WhatsAppContactLink({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const paymentConfig = useApiQuery(["public", "payment-config"], getPublicPaymentConfig);
  const number = paymentConfig.data?.contact.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const internationalNumber = normalizePhoneKE(number);

  return (
    <a
      href={`https://wa.me/${internationalNumber}`}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {children ?? formatPhoneKE(number)}
    </a>
  );
}
