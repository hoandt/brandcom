"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BookUser } from "lucide-react";
import { AddressBookModal } from "./address-book-modal";

type AddressBookProps = {
  onSelectAddress: (address: {
    id: string;
    name: string;
    phone: string;
    address: string;
    provinceId: string;
    provinceName: string;
    districtId: string;
    districtName: string;
    wardId: string;
    wardName: string;
    isDefault: boolean;
  } | null) => void;
  selectedAddressId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasSelection?: boolean;
  hideTrigger?: boolean;
};

export function AddressBook({
  onSelectAddress,
  selectedAddressId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  hasSelection,
  hideTrigger = false,
}: AddressBookProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange || setInternalOpen;

  const { data: addresses, isError, error } = useQuery({
    queryKey: ["user-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/user/addresses");
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch");
      }
      const json = await res.json();
      return json.data;
    },
    retry: false,
  });

  // Automatically select address or clear selection
  useEffect(() => {
    if (!addresses) return;

    if (addresses.length > 0) {
      if (!hasSelection) {
        const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
        if (defaultAddress) {
          onSelectAddress(defaultAddress);
        }
      }
    } else {
      // If there are no addresses at all, clear any existing selection
      if (hasSelection) {
        onSelectAddress(null);
      }
    }
  }, [addresses, hasSelection, onSelectAddress]);

  if (isError && (error as Error).message === "Unauthorized") {
    return null;
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          className="h-9 rounded-xl text-xs uppercase tracking-wider font-semibold text-primary hover:bg-primary/10 transition-all border-0"
        >
          <BookUser className="h-4 w-4 mr-1.5" />
          Sổ địa chỉ
        </Button>
      )}

      <AddressBookModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        selectedAddressId={selectedAddressId}
        onSelectAddress={onSelectAddress}
      />
    </>
  );
}
