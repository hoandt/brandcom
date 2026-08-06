"use client";

import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

type InventoryVariant = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  inventories: {
    quantity: number;
    warehouse: { id: string; name: string; code: string; isDefault: boolean; isActive: boolean };
  }[];
};

export function ProductInventoryDialog({ productName, variants }: { productName: string; variants: InventoryVariant[] }) {
  const [open, setOpen] = useState(false);
  const total = variants.reduce((sum, variant) => sum + variant.stock, 0);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-2 border border-input bg-background px-3 text-xs font-semibold hover:border-primary hover:text-primary">
        <Boxes className="h-3.5 w-3.5" />
        <span>{total} in stock</span>
        <span className="text-[10px] font-normal text-muted-foreground">· {variants.length} variants</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-3xl [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Inventory by warehouse</DialogTitle>
            <DialogDescription>{productName} · {total} units across {variants.length} variants</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {variants.map((variant) => (
              <section key={variant.id} className="border-b last:border-b-0">
                <div className="flex items-center justify-between bg-muted/30 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{variant.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{variant.sku}</p>
                  </div>
                  <strong className="text-sm">{variant.stock} total</strong>
                </div>
                {variant.inventories.length === 0 ? (
                  <p className="px-5 py-3 text-xs text-muted-foreground">No warehouse inventory.</p>
                ) : (
                  <div className="divide-y">
                    {variant.inventories.map((inventory) => (
                      <div key={inventory.warehouse.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{inventory.warehouse.name}</span>
                            {inventory.warehouse.isDefault && <span className="bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Default</span>}
                            {!inventory.warehouse.isActive && <span className="bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Inactive</span>}
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{inventory.warehouse.code}</p>
                        </div>
                        <span className="font-mono text-sm font-bold tabular-nums">{inventory.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t bg-background px-5 py-4">
            <span className="text-xs text-muted-foreground">Total inventory <strong className="ml-2 text-base text-foreground">{total}</strong></span>
            <Button type="button" onClick={() => setOpen(false)} className="h-9 rounded-none px-5 text-xs uppercase tracking-wider">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
