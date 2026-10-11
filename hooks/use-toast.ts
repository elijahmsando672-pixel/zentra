"use client";

import { toast } from "sonner";

type ToastOptions = {
  title?: string;
  description?: string;
};

export function useToast() {
  const success = (message: string, options?: ToastOptions) =>
    toast.success(options?.title ?? message, {
      description: options?.title ? options.description : undefined,
    });

  const error = (message: string, options?: ToastOptions) =>
    toast.error(options?.title ?? message, {
      description: options?.title ? options.description : undefined,
    });

  const info = (message: string, options?: ToastOptions) =>
    toast.info(options?.title ?? message, {
      description: options?.title ? options.description : undefined,
    });

  const loading = (message: string) => toast.loading(message);

  const dismiss = (id?: string | number) => toast.dismiss(id);

  const promise = toast.promise;

  return { success, error, info, loading, dismiss, promise, raw: toast };
}

export { toast };
