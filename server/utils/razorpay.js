// Small Razorpay client. No extra package: it talks to the REST API directly.
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   -> turns online payment on
//   RAZORPAY_WEBHOOK_SECRET                -> lets Razorpay confirm payments by itself
const crypto = require("crypto");

const API = "https://api.razorpay.com/v1";

const keyId = () => process.env.RAZORPAY_KEY_ID;
const keySecret = () => process.env.RAZORPAY_KEY_SECRET;

const isEnabled = () => Boolean(keyId() && keySecret());

const call = async (path, body) => {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    const error = new Error(data?.error?.description || `Razorpay error ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code;
    error.description = data?.error?.description;
    throw error;
  }

  return data;
};

// amount is in paise (Rs 500 = 50000)
const createOrder = ({ amountPaise, receipt, notes }) =>
  call("/orders", { amount: amountPaise, currency: "INR", receipt, notes });

const refundPayment = (paymentId, { amountPaise, receipt, notes }) =>
  call(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    amount: amountPaise,
    speed: "normal",
    receipt,
    notes,
  });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// what Razorpay Checkout returns after a payment: signature = HMAC(order_id|payment_id)
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!keySecret() || typeof signature !== "string") return false;
  const expected = crypto.createHmac("sha256", keySecret()).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
};

// webhooks are signed over the RAW request body
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !Buffer.isBuffer(rawBody) || typeof signature !== "string") return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
};

module.exports = {
  isEnabled,
  keyId,
  createOrder,
  refundPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
