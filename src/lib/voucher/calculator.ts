export type VoucherBenefit =
  | {
      scope: "cart";
      type: "fixed_amount";
      value: number;
    }
  | {
      scope: "cart";
      type: "percentage";
      value: number;
      maxDiscountAmount?: number;
    }
  | {
      scope: "shipping";
      type: "fixed_amount";
      value: number;
    }
  | {
      scope: "shipping";
      type: "free_shipping";
    };

export interface CalculateDiscountParams {
  benefit: VoucherBenefit;
  cartSubtotal: number; // in cents/smallest currency unit
  shippingFee: number; // in cents/smallest currency unit
}

export interface DiscountResult {
  cartDiscount: number;
  shippingDiscount: number;
  totalDiscount: number;
  totalBeforeDiscount: number;
  totalAfterDiscount: number;
}

/**
 * Calculates discounts purely without database operations.
 * Money is represented as integers (smallest currency unit).
 */
export function calculateDiscount({
  benefit,
  cartSubtotal,
  shippingFee,
}: CalculateDiscountParams): DiscountResult {
  let cartDiscount = 0;
  let shippingDiscount = 0;

  if (benefit.scope === "cart") {
    if (benefit.type === "fixed_amount") {
      cartDiscount = Math.min(benefit.value, cartSubtotal);
    } else if (benefit.type === "percentage") {
      cartDiscount = Math.floor((cartSubtotal * benefit.value) / 100);
      if (benefit.maxDiscountAmount !== undefined && benefit.maxDiscountAmount !== null) {
        cartDiscount = Math.min(cartDiscount, benefit.maxDiscountAmount);
      }
    }
  } else if (benefit.scope === "shipping") {
    if (benefit.type === "fixed_amount") {
      shippingDiscount = Math.min(benefit.value, shippingFee);
    } else if (benefit.type === "free_shipping") {
      shippingDiscount = shippingFee;
    }
  }

  // Ensure discounts never make their respective categories negative
  cartDiscount = Math.max(0, Math.min(cartDiscount, cartSubtotal));
  shippingDiscount = Math.max(0, Math.min(shippingDiscount, shippingFee));

  const totalBeforeDiscount = cartSubtotal + shippingFee;
  const totalDiscount = cartDiscount + shippingDiscount;
  const totalAfterDiscount = Math.max(totalBeforeDiscount - totalDiscount, 0);

  return {
    cartDiscount,
    shippingDiscount,
    totalDiscount,
    totalBeforeDiscount,
    totalAfterDiscount,
  };
}
