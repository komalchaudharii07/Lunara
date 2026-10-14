// Loads Razorpay's payment window only when someone actually pays.
const SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loading = null;

export function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();

  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        loading = null; // allow another try
        reject(
          new Error("Couldn't load the payment window. Check your connection and try again.")
        );
      };
      document.body.appendChild(script);
    });
  }

  return loading;
}

/**
 * payment: { keyId, orderId, amount (paise), currency, description } from the server
 * onPaid({ orderId, paymentId, signature }) runs after a successful payment
 * onDismiss() runs when the window is closed without paying
 * onFailed(message) runs when an attempt fails (the person can try again inside the window)
 */
export async function openCheckout({ payment, onPaid, onDismiss, onFailed }) {
  await loadCheckout();

  const checkout = new window.Razorpay({
    key: payment.keyId,
    order_id: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    name: "Lunara",
    description: payment.description,
    theme: { color: "#e58da4" },
    handler: (response) =>
      onPaid({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      }),
    modal: {
      escape: true,
      confirm_close: true,
      ondismiss: () => onDismiss?.(),
    },
  });

  checkout.on("payment.failed", (event) =>
    onFailed?.(event?.error?.description || "The payment didn't go through.")
  );

  checkout.open();
}