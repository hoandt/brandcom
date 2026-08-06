"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Loader2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

export type Location = {
  location_id: string;
  name: string;
  parent_id?: string | number;
  level: number;
  shipping_mappings?: {
    spx?:
      | { province: string; district: string; ward: string; location_count?: number }
      | { province: string; district: string; ward: string; location_count?: number }[];
  };
};

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};
type AddressCascaderProps = {
  value?: {
    province?: Location;
    district?: Location;
    ward?: Location;
  };
  onChange: (value: {
    province?: Location;
    district?: Location;
    ward?: Location;
  }) => void;
  error?: boolean;
  square?: boolean;
};

export function AddressCascader({ value, onChange, error, square = false }: AddressCascaderProps) {
  const [open, setOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"province" | "child">("province");
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [tempProvince, setTempProvince] = useState<Location | undefined>(value?.province);

  // We use one 'tempChild' to represent Ward
  const [tempChild, setTempChild] = useState<Location | undefined>(value?.ward);

  useEffect(() => {
    if (open) {
      setTempProvince(value?.province);
      setTempChild(value?.ward);
      if (!value?.province) setActiveTab("province");
      else setActiveTab("child");
    }
  }, [open, value]);

  useEffect(() => {
    setSearchQuery("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [activeTab]);

  const fetchLocations = async (parentId: string | number) => {
    const res = await fetch(`/api/locations?parent_id=${parentId}`);
    const json = await res.json();
    return json.data as Location[];
  };

  const fetchWards = async (provinceId: string) => {
    const res = await fetch(`/api/locations/wards?province_id=${provinceId}`);
    const json = await res.json();
    return json.data as Location[];
  };

  const { data: provinces, isLoading: loadingProvinces } = useQuery({
    queryKey: ["locations", "-1"],
    queryFn: () => fetchLocations("-1"),
  });

  const { data: children, isLoading: loadingChildren } = useQuery({
    queryKey: ["locations", "wards-by-prov", tempProvince?.location_id],
    queryFn: () => fetchWards(tempProvince!.location_id),
    enabled: !!tempProvince,
  });

  const handleProvinceSelect = (province: Location) => {
    setTempProvince(province);
    setTempChild(undefined);
    setActiveTab("child");
  };

  const handleChildSelect = (child: Location) => {
    setTempChild(child);
    onChange({
      province: tempProvince,
      district: undefined,
      ward: child,
    });
    setOpen(false);
  };

  const displayValue = [
    value?.province?.name,
    value?.ward?.name,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center justify-between h-12 border-0 bg-transparent px-0 text-[15px] font-normal transition-colors outline-none focus:ring-0 focus:outline-none ring-0 shadow-none",
          !displayValue && "text-muted-foreground/60",
          error && "text-destructive"
        )}
      >
        <span className="truncate">{displayValue || "Chọn Tỉnh / Thành phố"}</span>
        {value?.province ? (
          <div
            className="ml-2 shrink-0 text-muted-foreground/60 hover:text-foreground p-1"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange({});
            }}
          >
            <X className="h-4 w-4" />
          </div>
        ) : (
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
        )}
      </PopoverTrigger>
      <PopoverContent className={cn("w-[340px] p-0 gap-0 border-0 ring-1 ring-black/5 dark:ring-white/10 shadow-2xl overflow-hidden bg-background", square ? "rounded-none" : "rounded-2xl")} align="start">
        <div className="flex border-b border-border">
          <button
            className={cn(
              "flex-1 text-xs py-4 text-center border-b-2 transition-colors",
              activeTab === "province"
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("province")}
          >
            Tỉnh / TP
          </button>
          <button
            className={cn(
              "flex-1 text-xs py-2 text-center border-b-2 transition-colors",
              activeTab === "child"
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
              !tempProvince && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => tempProvince && setActiveTab("child")}
            disabled={!tempProvince}
          >
            Phường / Xã
          </button>
        </div>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full bg-secondary/50 h-9 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary border-none", square ? "rounded-none" : "rounded-md")}
            />
          </div>
        </div>

        <div className="h-[260px] overflow-y-auto p-1 scrollbar-thin">
          {activeTab === "province" && (
            <div className="space-y-1">
              {loadingProvinces ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                provinces
                  ?.filter((p) =>
                    removeAccents(p.name).includes(removeAccents(searchQuery))
                  )
                  .map((province) => (
                    <button
                      key={province.location_id}
                      onClick={() => handleProvinceSelect(province)}
                      className={cn("flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary/80 transition-colors", square ? "rounded-none" : "rounded-md")}
                    >
                      <span>{province.name}</span>
                      {tempProvince?.location_id === province.location_id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))
              )}
            </div>
          )}

          {activeTab === "child" && (
            <div className="space-y-1">
              {loadingChildren ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                children
                  ?.filter((c) =>
                    removeAccents(c.name).includes(removeAccents(searchQuery))
                  )
                  .map((child) => (
                    <button
                      key={child.location_id}
                      onClick={() => handleChildSelect(child)}
                      className={cn("flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary/80 transition-colors", square ? "rounded-none" : "rounded-md")}
                    >
                      <span className="text-left">{child.name}</span>
                      {tempChild?.location_id === child.location_id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
