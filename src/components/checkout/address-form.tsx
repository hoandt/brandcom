"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AddressData = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
};

type AddressFormProps = {
  onSubmit: (data: AddressData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
};

export function AddressForm({ onSubmit, onCancel, isLoading = false }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressData>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
          placeholder="John Doe"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          placeholder="123 Main St, Apt 4B"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City / State / Zip</Label>
        <Input
          id="city"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
          placeholder="New York, NY 10001"
        />
      </div>

      <div className="pt-4 flex gap-4">
        {onCancel && (
          <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Processing..." : "Complete Purchase"}
        </Button>
      </div>
    </form>
  );
}
