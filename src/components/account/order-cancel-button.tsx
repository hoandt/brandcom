"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";


type OrderCancelButtonProps = {
  orderId: string;
  cancelText: string;
  confirmText: string;
};

export function OrderCancelButton({ orderId, cancelText, confirmText }: OrderCancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!window.confirm(confirmText)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        // Refresh the current page to show updated status
        router.refresh();
      } else {
        alert(data.message || "Failed to cancel order");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleCancel}
      disabled={isLoading}
      className="h-8 px-3 text-xs font-medium rounded-none"
    >
      {isLoading ? "..." : cancelText}
    </Button>
  );
}
