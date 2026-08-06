"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Box, Check, KeyRound, Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CarrierSettings = {
  enabled: boolean;
  serviceType: number;
  senderCountry: string;
  senderName: string | null;
  senderPhone: string | null;
  paymentRole: number;
  codCollection: number;
  defaultCodAmount: number;
  highValueProcessingCollection: number;
  collectType: number;
  pickupLeadTimeMinutes: number;
  pickupTimeRangeId: number | null;
  allowMutualCheck: number;
  allowTryOn: number;
  voucherCode: string | null;
  parcelWeightPerItem: number;
  minimumParcelWeight: number;
  parcelLength: number;
  parcelWidth: number;
  parcelHeight: number;
  parcelItemName: string;
  expressInsuredValue: number;
  vasTypes: string[];
  collectFeeAmount: number;
  defaultDeliverInstruction: string | null;
};

type CredentialStatus = {
  appId: boolean;
  appSecret: boolean;
  userId: boolean;
  userSecret: boolean;
  configured: boolean;
};

type ResponseData = { settings: CarrierSettings; credentials: CredentialStatus };

const initialSettings: CarrierSettings = {
  enabled: true,
  serviceType: 1,
  senderCountry: "VN",
  senderName: null,
  senderPhone: null,
  paymentRole: 1,
  codCollection: 0,
  defaultCodAmount: 0,
  highValueProcessingCollection: 0,
  collectType: 2,
  pickupLeadTimeMinutes: 60,
  pickupTimeRangeId: null,
  allowMutualCheck: 1,
  allowTryOn: 1,
  voucherCode: null,
  parcelWeightPerItem: 0.2,
  minimumParcelWeight: 1,
  parcelLength: 12,
  parcelWidth: 12,
  parcelHeight: 6,
  parcelItemName: "default",
  expressInsuredValue: 0,
  vasTypes: [],
  collectFeeAmount: 0,
  defaultDeliverInstruction: null,
};

export default function ShippingSettingsPage() {
  const params = useParams<{ locale: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery<ResponseData>({
    queryKey: ["admin-shipping-settings", "spx"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings/shipping");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load shipment settings");
      return result;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data?.settings) setForm(query.data.settings);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        const field = result.issues?.[0]?.path?.join(".");
        throw new Error(field ? `${result.error}: ${field}` : result.error || "Failed to save shipment settings");
      }
      return result as ResponseData;
    },
    onSuccess: (result) => {
      setForm(result.settings);
      setError(null);
      queryClient.setQueryData(["admin-shipping-settings", "spx"], result);
      queryClient.invalidateQueries({ queryKey: ["shipping-fee"] });
      toast.success("SPX shipment defaults saved");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
      toast.error(mutationError.message);
    },
  });

  const set = <K extends keyof CarrierSettings>(key: K, value: CarrierSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (query.isLoading) return <ShippingSettingsSkeleton />;
  if (query.isError) return <div className="border border-destructive bg-destructive/5 p-4 text-sm text-destructive">{query.error.message}</div>;

  const credentials = query.data?.credentials;

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/${params.locale}/admin/settings`} className="mb-2 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Global settings</Link>
          <h1 className="text-2xl font-bold tracking-tight">Shipment settings</h1>
          <p className="text-xs text-muted-foreground">Central defaults for carrier quote and order payloads. Warehouse and recipient addresses remain shipment-specific.</p>
        </div>
        <Button type="submit" disabled={save.isPending} className="h-9 rounded-none px-5 text-xs uppercase tracking-wider">
          {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : <><Save className="mr-2 h-4 w-4" /> Save defaults</>}
        </Button>
      </div>

      <section className="border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 p-4">
          <div className="flex gap-3"><Truck className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">SPX Express</h2><p className="text-xs text-muted-foreground">Carrier profile: SPX Vietnam</p></div></div>
          <CheckField label="Enabled" checked={form.enabled} onChange={(checked) => set("enabled", checked)} />
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Service"><Select value={String(form.serviceType)} onChange={(value) => set("serviceType", Number(value))}><option value="1">Standard</option><option value="2">Instant</option></Select></Field>
          <Field label="Sender country"><Input required maxLength={3} value={form.senderCountry} onChange={(event) => set("senderCountry", event.target.value.toUpperCase())} /></Field>
          <Field label="Default sender name"><Input value={form.senderName || ""} onChange={(event) => set("senderName", event.target.value || null)} placeholder="Uses carrier account when empty" /></Field>
          <Field label="Default sender phone"><Input value={form.senderPhone || ""} onChange={(event) => set("senderPhone", event.target.value || null)} placeholder="Uses carrier account when empty" /></Field>
        </div>
      </section>

      <SettingsSection icon={Truck} title="Fulfillment" description="Defaults applied to every SPX request unless the order supplies a value.">
        <Field label="Payment role"><Select value={String(form.paymentRole)} onChange={(value) => set("paymentRole", Number(value))}><option value="1">Sender</option><option value="2">Recipient</option></Select></Field>
        <Field label="Collection method"><Select value={String(form.collectType)} onChange={(value) => set("collectType", Number(value))}><option value="1">Pickup</option><option value="2">Drop-off</option></Select></Field>
        <Field label="COD"><Select value={String(form.codCollection)} onChange={(value) => set("codCollection", Number(value))}><option value="0">Disabled</option><option value="1">Enabled</option></Select></Field>
        <NumberField label="Default COD amount" value={form.defaultCodAmount} min={0} onChange={(value) => set("defaultCodAmount", value)} suffix="VND" />
        <Field label="High-value processing"><Select value={String(form.highValueProcessingCollection)} onChange={(value) => set("highValueProcessingCollection", Number(value))}><option value="0">Disabled</option><option value="1">Enabled</option></Select></Field>
        <Field label="Voucher code"><Input value={form.voucherCode || ""} onChange={(event) => set("voucherCode", event.target.value || null)} placeholder="No voucher" /></Field>
        <NumberField label="Pickup lead time" value={form.pickupLeadTimeMinutes} min={0} onChange={(value) => set("pickupLeadTimeMinutes", value)} suffix="minutes" />
        <NullableNumberField label="Pickup time range ID" value={form.pickupTimeRangeId} onChange={(value) => set("pickupTimeRangeId", value)} />
        <Field label="Mutual inspection"><Select value={String(form.allowMutualCheck)} onChange={(value) => set("allowMutualCheck", Number(value))}><option value="0">Disabled</option><option value="1">Enabled</option></Select></Field>
        <Field label="Try-on"><Select value={String(form.allowTryOn)} onChange={(value) => set("allowTryOn", Number(value))}><option value="0">Disabled</option><option value="1">Enabled</option></Select></Field>
        <div className="md:col-span-2"><Field label="Default delivery instruction"><Input value={form.defaultDeliverInstruction || ""} onChange={(event) => set("defaultDeliverInstruction", event.target.value || null)} placeholder="No default instruction" /></Field></div>
      </SettingsSection>

      <SettingsSection icon={Box} title="Parcel defaults" description="Used to estimate shipping when product-level dimensions are unavailable.">
        <NumberField label="Weight per item" value={form.parcelWeightPerItem} min={0.01} step="0.01" onChange={(value) => set("parcelWeightPerItem", value)} suffix="kg" />
        <NumberField label="Minimum parcel weight" value={form.minimumParcelWeight} min={0.01} step="0.01" onChange={(value) => set("minimumParcelWeight", value)} suffix="kg" />
        <NumberField label="Length" value={form.parcelLength} min={0.01} step="0.01" onChange={(value) => set("parcelLength", value)} suffix="cm" />
        <NumberField label="Width" value={form.parcelWidth} min={0.01} step="0.01" onChange={(value) => set("parcelWidth", value)} suffix="cm" />
        <NumberField label="Height" value={form.parcelHeight} min={0.01} step="0.01" onChange={(value) => set("parcelHeight", value)} suffix="cm" />
        <Field label="Item name"><Input required value={form.parcelItemName} onChange={(event) => set("parcelItemName", event.target.value)} /></Field>
        <NumberField label="Insured value" value={form.expressInsuredValue} min={0} onChange={(value) => set("expressInsuredValue", value)} suffix="VND" />
      </SettingsSection>

      <SettingsSection icon={Box} title="Value-added services" description="Optional SPX VAS values included only when configured.">
        <Field label="VAS types"><Input value={form.vasTypes.join(", ")} onChange={(event) => set("vasTypes", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="Example: 1, 2" /><Help>Comma-separated SPX VAS identifiers.</Help></Field>
        <NumberField label="Collect fee amount" value={form.collectFeeAmount} min={0} onChange={(value) => set("collectFeeAmount", value)} suffix="VND" />
      </SettingsSection>

      <section className="border bg-card">
        <div className="flex gap-3 border-b bg-muted/20 p-4"><KeyRound className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">Credentials</h2><p className="text-xs text-muted-foreground">Secrets are read from the server environment and are never returned to the browser.</p></div></div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Credential label="App ID" configured={credentials?.appId} />
          <Credential label="App secret" configured={credentials?.appSecret} />
          <Credential label="User ID" configured={credentials?.userId} />
          <Credential label="User secret" configured={credentials?.userSecret} />
        </div>
        {!credentials?.configured && <p className="border-t border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Complete the missing SPX environment variables before enabling live quotes.</p>}
      </section>

      {error && <p className="border border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end border-t bg-background/95 p-3 backdrop-blur md:left-[var(--sidebar-width)]">
        <Button type="submit" disabled={save.isPending} className="h-10 rounded-none px-8 text-xs uppercase tracking-wider">{save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save shipment defaults"}</Button>
      </div>
    </form>
  );
}

function SettingsSection({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return <section className="border bg-card"><div className="flex gap-3 border-b bg-muted/20 p-4"><Icon className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider">{label}{children}</label>; }
function Help({ children }: { children: React.ReactNode }) { return <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">{children}</span>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-none border border-input bg-background px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-ring">{children}</select>; }
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded-none accent-primary" />{label}</label>; }
function NumberField({ label, value, onChange, min, step = "1", suffix }: { label: string; value: number; onChange: (value: number) => void; min: number; step?: string; suffix?: string }) { return <Field label={label}><div className="flex"><Input required type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-none" />{suffix && <span className="flex items-center border border-l-0 bg-muted/30 px-3 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">{suffix}</span>}</div></Field>; }
function NullableNumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <Field label={label}><Input type="number" min="1" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} placeholder="Not set" className="rounded-none" /></Field>; }
function Credential({ label, configured }: { label: string; configured?: boolean }) { return <div className="flex items-center justify-between bg-card p-4 text-xs"><span>{label}</span><span className={configured ? "inline-flex items-center gap-1 text-emerald-700" : "text-destructive"}>{configured && <Check className="h-3.5 w-3.5" />}{configured ? "Configured" : "Missing"}</span></div>; }
function ShippingSettingsSkeleton() { return <div className="grid animate-pulse gap-5"><div className="h-12 w-64 bg-muted" />{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-52 border bg-muted/30" />)}</div>; }
