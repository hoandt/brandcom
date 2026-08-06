"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type OrderDetailClientProps = {
  orderId: string;
  initialOrderStatus: string;
  initialPaymentStatus: string;
};

export function OrderDetailClient({
  orderId,
  initialOrderStatus,
  initialPaymentStatus,
}: OrderDetailClientProps) {
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus, paymentStatus })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Order status updated successfully!");
        router.refresh();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-none p-3 shadow-none space-y-3">
      <h3 className="font-bold text-xs uppercase tracking-widest border-b pb-2">
        Manage Statuses
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Order Status Select */}
        <div className="grid gap-1.5">
          <Label htmlFor="orderStatus" className="text-xs uppercase tracking-widest font-bold">
            Order Status
          </Label>
          <select
            id="orderStatus"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            className="h-9 border rounded-none bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED (Restores Stock)</option>
          </select>
        </div>

        {/* Payment Status Select */}
        <div className="grid gap-1.5">
          <Label htmlFor="paymentStatus" className="text-xs uppercase tracking-widest font-bold">
            Payment Status
          </Label>
          <select
            id="paymentStatus"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="h-9 border rounded-none bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button
          type="button"
          onClick={handleUpdate}
          disabled={loading}
          className="h-9 px-6 rounded-none uppercase tracking-wider text-xs font-bold"
        >
          {loading ? "Updating..." : "Save Status Changes"}
        </Button>
      </div>
    </div>
  );
}
