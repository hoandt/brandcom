"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { Loader2, ChevronDown, ChevronRight, MapPin, ShoppingBag, User, Mail, Phone } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Order {
  id: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  provinceName: string;
  districtName: string;
  wardName: string;
  isDefault: boolean;
}

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  createdAt: string;
  orders: Order[];
  addresses: Address[];
  totalSpent: number;
  ordersCount: number;
}

export default function AdminCustomersPage() {
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<{ customers: Customer[] }>({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/${locale}/admin/login`;
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch customers");
      }
      return res.json();
    },
  });

  const filtered = data?.customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }) ?? [];

  const getStatusColor = (s: string) => {
    switch (s) {
      case "PROCESSING": return "bg-blue-100 text-blue-800 border-blue-200";
      case "SHIPPED": return "bg-purple-100 text-purple-800 border-purple-200";
      case "DELIVERED": return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentColor = (s: string) => {
    switch (s) {
      case "PAID": return "bg-green-100 text-green-800 border-green-200";
      case "REFUNDED": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-red-100 text-red-800 border-red-200";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-xs text-muted-foreground">Registered store users with order history and address book.</p>
        </div>
        {!isLoading && data && (
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            {data.customers.length} Total Customers
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 border border-border rounded-none bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="border rounded-none overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-destructive">
            Failed to load customers. Please refresh.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            {search ? "No customers match your search." : "No registered customers yet."}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Contact</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Joined</th>
                <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider">Orders</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Spent</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filtered.map((customer) => {
                const isOpen = expandedId === customer.id;
                return (
                  <React.Fragment key={customer.id}>
                    <tr
                      className="hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isOpen ? null : customer.id)}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-none border border-border bg-muted flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground flex-shrink-0 overflow-hidden">
                            {customer.image ? (
                              <img src={customer.image} alt={customer.name ?? ""} className="w-full h-full object-cover" />
                            ) : (
                              (customer.name?.[0] || customer.email?.[0] || "?").toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{customer.name || "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{customer.id.slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-4 py-2.5">
                        <div className="text-xs">{customer.email || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{customer.phone || "No phone"}</div>
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(customer.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      {/* Orders count */}
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-xs font-bold">{customer.ordersCount}</span>
                      </td>
                      {/* Total spent */}
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-primary">
                        {formatPrice(customer.totalSpent, locale)}
                      </td>
                      {/* Expand toggle */}
                      <td className="px-4 py-2.5 text-right">
                        {isOpen
                          ? <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                        }
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isOpen && (
                      <tr className="bg-muted/5">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Orders */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order History ({customer.orders.length})</span>
                              </div>
                              {customer.orders.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No orders yet.</p>
                              ) : (
                                <div className="border rounded-none overflow-hidden divide-y divide-border">
                                  {customer.orders.slice(0, 5).map((order) => (
                                    <div key={order.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/10">
                                      <div>
                                        <a
                                          href={`/${locale}/admin/orders/${order.id}`}
                                          className="font-bold hover:underline hover:text-primary transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          #{order.id.slice(-8).toUpperCase()}
                                        </a>
                                        <div className="text-[10px] text-muted-foreground">
                                          {new Date(order.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-none border ${getPaymentColor(order.paymentStatus)}`}>
                                          {order.paymentStatus}
                                        </span>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-none border ${getStatusColor(order.orderStatus)}`}>
                                          {order.orderStatus}
                                        </span>
                                        <span className="font-bold text-primary">{formatPrice(order.totalAmount, locale)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {customer.orders.length > 5 && (
                                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-center">
                                      +{customer.orders.length - 5} more orders
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Addresses */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Address Book ({customer.addresses.length})</span>
                              </div>
                              {customer.addresses.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No saved addresses.</p>
                              ) : (
                                <div className="border rounded-none overflow-hidden divide-y divide-border">
                                  {customer.addresses.map((addr) => (
                                    <div key={addr.id} className="px-3 py-2 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold">{addr.name}</span>
                                        {addr.isDefault && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-none border bg-primary/10 text-primary border-primary/20">Default</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">{addr.phone}</div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {addr.address}, {addr.wardName}, {addr.districtName}, {addr.provinceName}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
