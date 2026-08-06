"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-background hover:bg-secondary/40 text-xs font-semibold shadow-sm transition-all"
    >
      <Printer className="w-4 h-4" />
      Print Statement
    </button>
  );
}
