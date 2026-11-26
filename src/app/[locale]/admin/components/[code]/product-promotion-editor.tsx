"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductPromotionConfig, PromotionSettings } from "@/lib/product-promotion";

const toggleFields = [
  ["enabled", "Promotion layout"],
  ["stickyBar", "Sticky purchase bar"],
  ["cartDrawer", "Cart confirmation drawer"],
  ["bundleUpgrade", "Bundle savings and upgrade prompts"],
  ["liveViewers", "Live viewer count"],
  ["purchaseToast", "Recent purchase toast"],
] as const;

const copyFields = [
  ["announcement", "Announcement", 180],
  ["intro", "Product introduction", 500],
  ["returnPolicy", "Return policy", 1000],
] as const;

const selectClass = "h-10 w-full border bg-background px-3 text-sm";

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  );
}

function PromotionFields({ settings, onChange, override = false }: {
  settings: PromotionSettings;
  onChange: (settings: PromotionSettings) => void;
  override?: boolean;
}) {
  function update<K extends keyof PromotionSettings>(key: K, value: PromotionSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  const inheritedLabel = override ? "Inherit shared setting" : "Use storefront default";
  const comparison = settings.comparison;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {toggleFields.map(([key, label]) => (
          <Field key={key} label={label}>
            {(id) => (
              <select id={id} className={selectClass} value={settings[key] === undefined ? "" : String(settings[key])}
                onChange={(event) => update(key, event.target.value === "" ? undefined : event.target.value === "true")}>
                <option value="">{inheritedLabel}</option>
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            )}
          </Field>
        ))}
        <Field label="Initial variant">
          {(id) => (
            <select id={id} className={selectClass} value={settings.defaultVariant ?? ""}
              onChange={(event) => update("defaultVariant", event.target.value === "best-value" ? "best-value" : event.target.value === "first" ? "first" : undefined)}>
              <option value="">{inheritedLabel}</option>
              <option value="first">First available</option>
              <option value="best-value">Lowest price per pair for pair bundles</option>
            </select>
          )}
        </Field>
        <Field label="Low-stock threshold (0 hides the count)">
          {(id) => (
            <Input id={id} type="number" min={0} max={100} value={settings.lowStockThreshold ?? ""} placeholder={inheritedLabel}
              onChange={(event) => update("lowStockThreshold", event.target.value === "" ? undefined : event.target.valueAsNumber)} />
          )}
        </Field>
        <Field label="Flash-sale voucher code">
          {(id) => (
            <Input id={id} maxLength={80} value={settings.flashVoucherCode ?? ""}
              placeholder={override ? "Inherit shared voucher" : "Code from Admin → Discounts"}
              onChange={(event) => update("flashVoucherCode", event.target.value)} />
          )}
        </Field>
        {override && <div className="flex flex-wrap items-end gap-4 text-xs">
          <button type="button" className="underline" onClick={() => update("flashVoucherCode", undefined)}>Inherit voucher</button>
          <button type="button" className="underline" onClick={() => update("flashVoucherCode", "")}>Hide countdown</button>
        </div>}
      </div>

      <div className="space-y-3 border-l-2 pl-4">
        <Field label="Express delivery countdown">
          {(id) => (
            <select id={id} className={selectClass} value={settings.expressShipping ? "custom" : settings.expressShipping === null ? "off" : ""}
              onChange={(event) => update("expressShipping", event.target.value === "custom"
                ? { cutoff: "", area: "TP.HCM", days: [1, 2, 3, 4, 5, 6] }
                : event.target.value === "off" ? null : undefined)}>
              <option value="">{inheritedLabel}</option>
              <option value="off">Off</option>
              <option value="custom">Set operating hours</option>
            </select>
          )}
        </Field>
        <p className="text-xs text-muted-foreground">Use this for delivery areas and operating days already served by your express carrier.</p>
        {settings.expressShipping && (() => {
          const express = settings.expressShipping;
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Order cutoff (Vietnam time)">
                  {(id) => <Input id={id} required type="time" value={express.cutoff}
                    onChange={(event) => update("expressShipping", { ...express, cutoff: event.target.value })} />}
                </Field>
                <Field label="Eligible delivery area">
                  {(id) => <Input id={id} required value={express.area} maxLength={80}
                    onChange={(event) => update("expressShipping", { ...express, area: event.target.value })} />}
                </Field>
              </div>
              <fieldset className="flex flex-wrap gap-3 text-sm">
                <legend className="mb-2">Operating days</legend>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, day) => (
                  <label key={day} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={express.days.includes(day)} onChange={(event) => {
                      const days = event.target.checked ? [...express.days, day] : express.days.filter((value) => value !== day);
                      update("expressShipping", { ...express, days });
                    }} />
                    {label}
                  </label>
                ))}
              </fieldset>
            </>
          );
        })()}
      </div>

      <div className="space-y-4">
        {copyFields.map(([key, label, limit]) => (
          <Field key={key} label={label}>
            {(id) => (
              <>
                <Textarea id={id} rows={key === "announcement" ? 2 : 3} maxLength={limit}
                  value={settings[key] ?? ""} placeholder={override && settings[key] === undefined ? inheritedLabel : undefined}
                  onChange={(event) => update(key, event.target.value)} />
                {override && (
                  <div className="flex gap-4 text-xs">
                    <button type="button" className="underline" onClick={() => update(key, undefined)}>Inherit</button>
                    <button type="button" className="underline" onClick={() => update(key, "")}>Hide</button>
                  </div>
                )}
              </>
            )}
          </Field>
        ))}
        {(["benefits", "trustLabels"] as const).map((key) => (
          <Field key={key} label={key === "benefits" ? "Benefit labels (up to six, one per line)" : "Trust labels (up to three, one per line)"}>
            {(id) => (
              <>
                <Textarea id={id} rows={3} value={settings[key]?.join("\n") ?? ""}
                  placeholder={override && settings[key] === undefined ? inheritedLabel : undefined}
                  onChange={(event) => update(key, event.target.value.split("\n"))} />
                {override && (
                  <div className="flex gap-4 text-xs">
                    <button type="button" className="underline" onClick={() => update(key, undefined)}>Inherit</button>
                    <button type="button" className="underline" onClick={() => update(key, [])}>Hide</button>
                  </div>
                )}
              </>
            )}
          </Field>
        ))}
      </div>

      <Field label="Comparison table">
        {(id) => (
          <select id={id} className={selectClass} value={comparison ? "custom" : comparison === null ? "off" : ""}
            onChange={(event) => update("comparison", event.target.value === "custom"
              ? { title: "", rows: [{ label: "", auria: "", alternative: "" }] }
              : event.target.value === "off" ? null : undefined)}>
            <option value="">{inheritedLabel}</option>
            <option value="off">Hide comparison</option>
            <option value="custom">Write comparison</option>
          </select>
        )}
      </Field>
      {comparison && (
        <div className="space-y-4 border-l-2 pl-4">
          <Field label="Comparison title">
            {(id) => <Input id={id} required value={comparison.title} maxLength={150}
              onChange={(event) => update("comparison", { ...comparison, title: event.target.value })} />}
          </Field>
          {comparison.rows.map((row, index) => (
            <div key={index} className="space-y-3 border p-3">
              {([["label", "Criterion", 80], ["auria", "Auria", 240], ["alternative", "What to compare", 240]] as const).map(([key, label, limit]) => (
                <Field key={key} label={label}>
                  {(id) => <Input id={id} required value={row[key]} maxLength={limit} onChange={(event) => {
                    const rows = comparison.rows.map((item, rowIndex) => rowIndex === index ? { ...item, [key]: event.target.value } : item);
                    update("comparison", { ...comparison, rows });
                  }} />}
                </Field>
              ))}
              <Button type="button" size="sm" variant="ghost" disabled={comparison.rows.length === 1}
                onClick={() => update("comparison", { ...comparison, rows: comparison.rows.filter((_, rowIndex) => rowIndex !== index) })}>Remove row</Button>
            </div>
          ))}
          <Button type="button" variant="outline" disabled={comparison.rows.length >= 8} onClick={() => update("comparison", {
            ...comparison, rows: [...comparison.rows, { label: "", auria: "", alternative: "" }],
          })}>Add row</Button>
        </div>
      )}
    </div>
  );
}

export function ProductPromotionEditor({ value, onChange }: {
  value: ProductPromotionConfig;
  onChange: (value: ProductPromotionConfig) => void;
}) {
  function updateProduct(index: number, nextProduct: ProductPromotionConfig["products"][number]) {
    onChange({ ...value, products: value.products.map((product, i) => i === index ? nextProduct : product) });
  }

  return (
    <div className="space-y-7">
      <section className="space-y-4" aria-label="Shared promotion settings">
        <div>
          <h3 className="m-0 text-lg font-semibold">Shared settings</h3>
          <p className="text-sm text-muted-foreground">Applies to Vietnamese product pages. Configure checkout discounts separately in Discounts or in the product catalog.</p>
        </div>
        <PromotionFields settings={value.defaults} onChange={(defaults) => onChange({ ...value, defaults })} />
      </section>
      <section className="space-y-4 border-t pt-5" aria-label="Product overrides">
        <div>
          <h3 className="m-0 text-lg font-semibold">Product overrides</h3>
          <p className="text-sm text-muted-foreground">Use the slug after /vi/products/ to customize one product.</p>
        </div>
        {value.products.map((product, index) => (
          <details key={index} className="border p-4">
            <summary className="cursor-pointer text-sm font-semibold">{product.slug || "New product override"}</summary>
            <div className="mt-4 space-y-4">
              <Field label="Product slug">
                {(id) => <Input id={id} required maxLength={180} value={product.slug}
                  onChange={(event) => updateProduct(index, { ...product, slug: event.target.value })} />}
              </Field>
              <PromotionFields settings={product.settings} override
                onChange={(settings) => updateProduct(index, { ...product, settings })} />
              <Button type="button" size="sm" variant="outline" onClick={() => onChange({
                ...value, products: value.products.filter((_, i) => i !== index),
              })}>Remove override</Button>
            </div>
          </details>
        ))}
        <Button type="button" variant="outline" disabled={value.products.length >= 500} onClick={() => onChange({
          ...value, products: [...value.products, { slug: "", settings: {} }],
        })}>Add product override</Button>
      </section>
    </div>
  );
}
