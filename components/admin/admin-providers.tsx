"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const message = sessionStorage.getItem("admin-toast");
    if (message) {
      sessionStorage.removeItem("admin-toast");
      toast.success(message);
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const success = params.get("success");
    if (error) toast.error(error);
    if (success) toast.success(success);
    if (error || success) {
      params.delete("error");
      params.delete("success");
      const query = params.toString();
      window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    }
  }, []);

  return (
    <TooltipProvider>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </TooltipProvider>
  );
}
