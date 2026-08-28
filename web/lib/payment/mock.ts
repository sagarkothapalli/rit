export type MockPaymentStatus = "NONE" | "DEMO_PAID" | "DEMO_EXEMPT";

export interface MockPayment {
  status: MockPaymentStatus;
  receiptId: string | null;
  paidAt: string | null;
  amountRupees: number;
}

export function emptyMockPayment(): MockPayment {
  return { status: "NONE", receiptId: null, paidAt: null, amountRupees: 0 };
}

export function demoReceiptId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const token = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 10).toUpperCase();
  return `DEMO/PAY/${token}`;
}

export function recordMockPayment(input: { bpl: boolean; amountRupees: number }): MockPayment {
  if (input.bpl) {
    return {
      status: "DEMO_EXEMPT",
      receiptId: demoReceiptId(),
      paidAt: new Date().toISOString(),
      amountRupees: 0,
    };
  }
  return {
    status: "DEMO_PAID",
    receiptId: demoReceiptId(),
    paidAt: new Date().toISOString(),
    amountRupees: input.amountRupees,
  };
}
