"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shuffle, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  images: { url: string }[];
}

interface VoucherBenefit {
  scope: "cart" | "shipping" | "payment";
  type: "fixed_amount" | "percentage" | "free_shipping";
  paymentMethod?: string;
  isAutomatic?: boolean;
  value?: number;
  maxDiscountAmount?: number;
  canCombine?: boolean;
}

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AdminNewVoucherPage() {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("active");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [minimumCartSubtotal, setMinimumCartSubtotal] = useState("");
  const [totalUsageLimit, setTotalUsageLimit] = useState("");
  const [usagePerCustomer, setUsagePerCustomer] = useState("");

  // Benefit states
  const [scope, setScope] = useState<"cart" | "shipping" | "payment">("cart");
  const [type, setType] = useState<"fixed_amount" | "percentage" | "free_shipping">("fixed_amount");
  const [paymentMethod, setPaymentMethod] = useState("all_online");
  const [isAutomatic, setIsAutomatic] = useState(true);
  const [benefitValue, setBenefitValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [canCombine, setCanCombine] = useState(false);

  // Product targeting
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: productsData } = useQuery<{ products: ProductItem[] }>({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products/list");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: showProductPicker,
  });

  const filteredProducts = (productsData?.products || []).filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !selectedProductIds.includes(p.id)
  );

  const selectedProducts = (productsData?.products || []).filter((p) =>
    selectedProductIds.includes(p.id)
  );

  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "cart" | "shipping" | "payment";
    setScope(val);
    if (val === "cart") {
      setType("fixed_amount");
    } else if (val === "payment") {
      setType("percentage");
    } else {
      setType("free_shipping");
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as "fixed_amount" | "percentage" | "free_shipping");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (new Date(startsAt) > new Date(endsAt)) {
      toast.error("Start date must be before end date");
      setLoading(false);
      return;
    }

    // Construct benefit JSON
    const benefit: VoucherBenefit = { scope, type, canCombine };
    if (scope === "payment") {
      benefit.paymentMethod = paymentMethod;
      benefit.isAutomatic = isAutomatic;
    }
    if (type !== "free_shipping") {
      const val = Number(benefitValue);
      if (isNaN(val) || val <= 0) {
        toast.error("Benefit value must be greater than 0");
        setLoading(false);
        return;
      }
      benefit.value = val;
    }
    if (scope === "cart" && type === "percentage" && maxDiscountAmount) {
      benefit.maxDiscountAmount = Number(maxDiscountAmount);
    }

    const payload = {
      name,
      description: description || null,
      code,
      status,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      minimumCartSubtotal: minimumCartSubtotal ? Number(minimumCartSubtotal) : null,
      benefit,
      productIds: selectedProductIds,
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      usagePerCustomer: usagePerCustomer ? Number(usagePerCustomer) : null,
    };

    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Voucher created successfully");
        router.push(`/${locale}/admin/discounts`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to create voucher");
      }
    } catch (error) {
      console.error("Error creating voucher:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[800px] mx-auto py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Voucher</h1>
        <p className="text-muted-foreground text-xs">Configure your new promotional campaign or shipping discount.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-card p-4 border border-border rounded-none shadow-none">
        {/* Core Voucher Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider font-bold">Voucher Name</Label>
            <Input
              id="name"
              required
              placeholder="e.g. Summer Flash Discount"
              className="h-9 rounded-none border-border"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="code" className="text-xs uppercase tracking-wider font-bold">Voucher Code</Label>
            <div className="flex gap-1.5">
              <Input
                id="code"
                required
                placeholder="e.g. SUMMER50"
                className="h-9 rounded-none border-border font-mono font-bold uppercase flex-1"
                value={code}
                onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-none px-2.5 shrink-0"
                onClick={() => setCode(generateCode())}
                title="Auto-generate code"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="grid gap-1.5">
          <Label htmlFor="description" className="text-xs uppercase tracking-wider font-bold">Description (Optional)</Label>
          <textarea
            id="description"
            placeholder="Internal note about this voucher campaign..."
            className="h-16 px-3 py-2 border border-border bg-background outline-none text-sm w-full rounded-none resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Benefit Settings */}
        <div className="p-3 border border-border bg-muted/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-1.5">Benefit Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-bold uppercase">Discount Target (Scope)</Label>
              <select
                className="h-9 px-3 border border-border bg-background outline-none text-sm w-full rounded-none"
                value={scope}
                onChange={handleScopeChange}
              >
                <option value="cart">Cart Subtotal</option>
                <option value="shipping">Shipping Fee</option>
                <option value="payment">Payment Method (Online/QR vs COD)</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-bold uppercase">Benefit Type</Label>
              <select
                className="h-9 px-3 border border-border bg-background outline-none text-sm w-full rounded-none"
                value={type}
                onChange={handleTypeChange}
              >
                {scope === "cart" ? (
                  <>
                    <option value="fixed_amount">Fixed Amount Discount</option>
                    <option value="percentage">Percentage Discount</option>
                  </>
                ) : scope === "payment" ? (
                  <>
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed_amount">Fixed Amount Discount (đ)</option>
                  </>
                ) : (
                  <>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="fixed_amount">Fixed Shipping Discount</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {scope === "payment" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold uppercase">Payment Method Target</Label>
                <select
                  className="h-9 px-3 border border-border bg-background outline-none text-sm w-full rounded-none"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="all_online">All Online / QR Payments (Non-COD)</option>
                  <option value="vnpay">VNPAY / VietQR</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>

              <div className="flex flex-col justify-center gap-1">
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={isAutomatic}
                    onChange={(e) => setIsAutomatic(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-xs font-bold uppercase">Apply automatically</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Applies automatically when customer selects this payment method at checkout.</span>
              </div>
            </div>
          )}

          {type !== "free_shipping" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="benefitValue" className="text-xs font-bold uppercase">
                  {type === "percentage" ? "Percentage Value (%)" : "Discount Value (đ)"}
                </Label>
                <Input
                  id="benefitValue"
                  type="number"
                  required
                  placeholder={type === "percentage" ? "15" : "50000"}
                  className="h-9 rounded-none"
                  value={benefitValue}
                  onChange={(e) => setBenefitValue(e.target.value)}
                />
              </div>

              {scope === "cart" && type === "percentage" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="maxDiscountAmount" className="text-xs font-bold uppercase">Max Discount Cap (đ - Optional)</Label>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    placeholder="e.g. 100000"
                    className="h-9 rounded-none"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 border border-border bg-background p-3">
            <input
              type="checkbox"
              checked={canCombine}
              onChange={(event) => setCanCombine(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-xs font-bold uppercase">Can use together</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Allow this voucher to be combined with other vouchers that also enable this option.
              </span>
            </span>
          </label>
        </div>

        {/* Product Targeting */}
        <div className="p-3 border border-border bg-muted/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-1.5">Product Targeting</h3>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="productScope"
                checked={selectedProductIds.length === 0 && !showProductPicker}
                onChange={() => {
                  setSelectedProductIds([]);
                  setShowProductPicker(false);
                }}
                className="accent-primary"
              />
              <span className="text-xs font-medium">All products</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="productScope"
                checked={selectedProductIds.length > 0 || showProductPicker}
                onChange={() => setShowProductPicker(true)}
                className="accent-primary"
              />
              <span className="text-xs font-medium">Specific products</span>
            </label>
          </div>

          {(showProductPicker || selectedProductIds.length > 0) && (
            <div className="space-y-2">
              {/* Selected products */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProducts.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[11px] font-medium"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds((prev) => prev.filter((id) => id !== p.id))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search + Dropdown */}
              <div className="relative">
                <div className="flex items-center border border-border bg-background">
                  <Search className="w-3.5 h-3.5 ml-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="h-8 px-2 outline-none text-xs w-full bg-transparent"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setShowProductPicker(true)}
                  />
                </div>
                {showProductPicker && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-0.5 border border-border bg-card shadow-md max-h-[200px] overflow-y-auto">
                    {filteredProducts.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-muted/50 text-left"
                        onClick={() => {
                          setSelectedProductIds((prev) => [...prev, p.id]);
                          setProductSearch("");
                        }}
                      >
                        {p.images[0] && (
                          <img src={p.images[0].url} alt={p.name} className="w-6 h-6 object-cover border border-border" />
                        )}
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground uppercase">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campaign Rules & Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="minimumCartSubtotal" className="text-xs font-bold uppercase">Min Order Subtotal (đ)</Label>
            <Input
              id="minimumCartSubtotal"
              type="number"
              placeholder="e.g. 150000"
              className="h-9 rounded-none"
              value={minimumCartSubtotal}
              onChange={(e) => setMinimumCartSubtotal(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="totalUsageLimit" className="text-xs font-bold uppercase">Total Usage Limit</Label>
            <Input
              id="totalUsageLimit"
              type="number"
              placeholder="e.g. 500 (Optional)"
              className="h-9 rounded-none"
              value={totalUsageLimit}
              onChange={(e) => setTotalUsageLimit(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="usagePerCustomer" className="text-xs font-bold uppercase">Usage Per Customer</Label>
            <Input
              id="usagePerCustomer"
              type="number"
              placeholder="e.g. 1 (Optional)"
              className="h-9 rounded-none"
              value={usagePerCustomer}
              onChange={(e) => setUsagePerCustomer(e.target.value)}
            />
          </div>
        </div>

        {/* Date Ranges & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs font-bold uppercase">Status</Label>
            <select
              className="h-9 px-3 border border-border bg-background outline-none text-sm w-full rounded-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="draft">Draft (Inactive)</option>
              <option value="paused">Paused (Inactive)</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="startsAt" className="text-xs font-bold uppercase">Starts At</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              required
              className="h-9 rounded-none text-xs"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="endsAt" className="text-xs font-bold uppercase">Ends At</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              required
              className="h-9 rounded-none text-xs"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-none px-6 text-xs uppercase font-bold tracking-wider"
            onClick={() => router.push(`/${locale}/admin/discounts`)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-9 rounded-none px-8 text-xs uppercase font-bold tracking-wider"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Creating...
              </>
            ) : (
              "Create Voucher"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
