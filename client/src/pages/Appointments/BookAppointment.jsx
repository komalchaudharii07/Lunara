import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  bookAppointment,
  cancelAppointment,
  getAppointmentSlots,
  getCheckout,
  getDoctor,
  getPaymentConfig,
  verifyPayment,
} from "../../services/api";
import { formatDateTime, formatTime } from "../../utils/dates";
import { openCheckout } from "../../utils/razorpayCheckout";

const DAYS_SHOWN = 14;

// The next 14 days as { key: "YYYY-MM-DD", weekday, day, month }.
// Slots are in India time, so the days are India days whatever the device says.
const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const buildDays = () =>
  Array.from({ length: DAYS_SHOWN }, (_, i) => {
    // shifted so the UTC getters read the India wall clock
    const d = new Date(Date.now() + IST_MS + i * DAY_MS);
    return {
      key: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
      day: d.getUTCDate(),
      month: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    };
  });

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function BookAppointment() {
  const { id } = useParams();
  const [days] = useState(buildDays);

  const [doctor, setDoctor] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [paymentsOn, setPaymentsOn] = useState(false);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [notScheduled, setNotScheduled] = useState(false);
  const [slot, setSlot] = useState(null);

  const [reason, setReason] = useState("");
  const [shareReport, setShareReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  // a booking that is held and waiting for payment: { appointment, payment, crisis }
  const [pending, setPending] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // ignores slot answers that arrive after the person picked another day
  const slotRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getDoctor(id)
      .then((data) => !cancelled && setDoctor(data.doctor))
      .catch((err) => !cancelled && setLoadError(err.message));
    getPaymentConfig()
      .then((data) => !cancelled && setPaymentsOn(Boolean(data.enabled)))
      .catch(() => {}); // without it we just show the "pay the doctor directly" text
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadSlots = async (key) => {
    const request = ++slotRequest.current;
    setSlotsLoading(true);
    setSlots([]);
    setSlot(null);
    setError("");

    try {
      const data = await getAppointmentSlots(id, key);
      if (request !== slotRequest.current) return;
      setSlots(data.slots || []);
      setNotScheduled(Boolean(data.notScheduled));
    } catch (err) {
      if (request === slotRequest.current) setError(err.message);
    } finally {
      if (request === slotRequest.current) setSlotsLoading(false);
    }
  };

  const pickDate = (key) => {
    setDate(key);
    loadSlots(key);
  };

  // the server confirms the payment before the booking counts
  const confirmPayment = async (booking, { orderId, paymentId, signature }) => {
    setVerifying(true);
    setError("");
    try {
      await verifyPayment({
        appointmentId: booking.appointment._id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
      setPending(null);
      setDone({ appointment: booking.appointment, crisis: booking.crisis, paid: true });
    } catch (err) {
      setError(err.message);
      // a payment that arrived too late is refunded: the held booking is gone
      if (err.status === 409) {
        setPending(null);
        if (date) loadSlots(date);
      }
    } finally {
      setVerifying(false);
    }
  };

  const startPayment = async (booking) => {
    setPending(booking);
    setError("");

    try {
      await openCheckout({
        payment: booking.payment,
        onPaid: (result) => confirmPayment(booking, result),
        onDismiss: () => setError("Payment window closed. Tap Pay now to continue."),
        onFailed: (message) => setError(message),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slot || saving) return;

    setSaving(true);
    setError("");

    try {
      const data = await bookAppointment({
        doctorId: id,
        startsAt: slot.startsAt,
        reason: reason.trim(),
        shareReport,
      });

      if (data.payment) {
        await startPayment(data);
      } else {
        setDone(data);
      }
    } catch (err) {
      setError(err.message);
      // someone else may have taken it: show the fresh list
      if (err.status === 409 || err.status === 400) loadSlots(date);
    } finally {
      setSaving(false);
    }
  };

  // open the payment window again for the held booking
  const handlePayAgain = async () => {
    if (!pending) return;
    setError("");
    try {
      const data = await getCheckout(pending.appointment._id);
      await startPayment({ ...pending, payment: data.payment });
    } catch (err) {
      setError(err.message);
      if (err.status === 404) {
        // the 10 minutes ran out
        setPending(null);
        if (date) loadSlots(date);
      }
    }
  };

  const handleReleaseHold = async () => {
    if (!pending) return;
    try {
      await cancelAppointment(pending.appointment._id);
    } catch {
      /* the hold ends by itself in a few minutes */
    }
    setPending(null);
    setSlot(null);
    if (date) loadSlots(date);
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">
          {loadError}
        </p>
        <Link to="/doctors" className="mt-4 inline-block text-sm text-[#d97d96]">
          Back to doctors
        </Link>
      </div>
    );
  }

  if (!doctor) {
    return (
      <p role="status" className="text-sm text-gray-500">
        Loading...
      </p>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-8 text-center shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
          <div className="text-4xl">🌸</div>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-[#292331]">
            Appointment booked
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {done.appointment.doctorName} · {formatDateTime(done.appointment.startsAt)}
          </p>
          {done.paid && (
            <p className="mt-1 text-sm text-green-600">Payment received. Thank you!</p>
          )}
          <p className="mt-2 text-xs leading-5 text-gray-500">
            The video call link appears on your Appointments page. We also sent
            you an email.
          </p>

          {done.crisis && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-left text-sm leading-6 text-red-700">
              You mentioned thoughts of harming yourself. If you are in danger
              or feel you might act on them, call <strong>112</strong> now, or
              Tele-MANAS on <strong>14416</strong>. You don&apos;t have to wait
              for your appointment.
            </p>
          )}

          <Link
            to="/appointments"
            className="mt-6 inline-block rounded-xl bg-[#e58da4] px-6 py-3 text-sm font-semibold text-white hover:bg-[#d97d96]"
          >
            View my appointments
          </Link>
        </div>
      </div>
    );
  }

  // a time is held and waiting for the payment
  if (pending) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-8 text-center shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
          <div className="text-4xl">💳</div>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-[#292331]">
            Complete your payment
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {doctor.name} · {formatDateTime(pending.appointment.startsAt)}
          </p>
          <p className="mt-1 text-lg font-semibold text-[#292331]">
            {rupees(pending.payment.amount / 100)}
          </p>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            This time is held for you for 10 minutes. If the payment window
            closed, open it again below. If money was taken but you see no
            confirmation, don&apos;t pay twice: your booking is confirmed
            automatically, or the money is refunded.
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handlePayAgain}
              disabled={verifying}
              className="rounded-xl bg-[#e58da4] px-6 py-3 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60"
            >
              {verifying ? "Confirming payment..." : "Pay now"}
            </button>
            <button
              type="button"
              onClick={handleReleaseHold}
              disabled={verifying}
              className="rounded-xl border border-[#eadde1] px-6 py-3 text-sm text-gray-500 hover:border-[#e58da4] disabled:opacity-60"
            >
              Cancel and choose another time
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fee = doctor.consultationFee;
  const payOnline = paymentsOn && fee != null && Number(fee) >= 1;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/doctors" className="text-sm text-[#d97d96]">
        ← Back to doctors
      </Link>

      <div className="mt-4 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fdf1f4] text-lg font-semibold text-[#d77f97]">
            {doctor.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#292331]">{doctor.name}</h1>
            <p className="text-sm text-[#d77f97]">{doctor.specialization}</p>
            <p className="mt-1 text-xs text-gray-500">
              {doctor.qualification}
              {fee != null && ` · ${rupees(fee)}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-6">
          {/* DATE */}
          <div>
            <p className="text-sm font-medium text-[#292331]">Choose a day</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={date === d.key}
                  onClick={() => pickDate(d.key)}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border px-2 py-3 text-xs transition ${
                    date === d.key
                      ? "border-[#e58da4] bg-[#fff0f3] text-[#d97d96]"
                      : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                  }`}
                >
                  <span>{d.weekday}</span>
                  <span className="text-lg font-semibold text-[#292331]">{d.day}</span>
                  <span>{d.month}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TIME */}
          {date && (
            <div>
              <p className="text-sm font-medium text-[#292331]">
                Choose a time <span className="font-normal text-gray-400">(India time)</span>
              </p>

              {slotsLoading ? (
                <p role="status" className="mt-3 text-sm text-gray-500">
                  Loading times...
                </p>
              ) : slots.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  {notScheduled
                    ? "This doctor hasn't opened bookings yet."
                    : "No times left on this day. Try another day."}
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.startsAt}
                      type="button"
                      aria-pressed={slot?.startsAt === s.startsAt}
                      onClick={() => setSlot(s)}
                      className={`rounded-xl border px-2 py-2.5 text-sm transition ${
                        slot?.startsAt === s.startsAt
                          ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                          : "border-[#eadde1] text-gray-600 hover:border-[#e58da4]"
                      }`}
                    >
                      {formatTime(s.startsAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DETAILS */}
          {slot && (
            <>
              <div>
                <label htmlFor="reason" className="mb-2 block text-sm font-medium text-[#292331]">
                  What would you like help with? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows="3"
                  maxLength={500}
                  placeholder="For example: irregular periods for 3 months"
                  className="w-full resize-none rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 py-3 text-sm outline-none focus:border-[#e58da4]"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#eadde1] bg-[#fffafb] p-4">
                <input
                  type="checkbox"
                  checked={shareReport}
                  onChange={(e) => setShareReport(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#e58da4]"
                />
                <span className="text-sm leading-6 text-gray-600">
                  <strong className="text-[#292331]">
                    Share my cycle report with the doctor
                  </strong>
                  <br />
                  They can see your age, height, weight and blood group, plus
                  your last 6 months of periods and daily logs, from 24 hours
                  before until 7 days after the visit. Your personal notes,
                  email and phone are not shared. You can switch this off any
                  time from your Appointments page.
                </span>
              </label>

              <p className="text-xs leading-5 text-gray-500">
                {payOnline ? (
                  <>
                    The visit is a video call. You pay {rupees(fee)} securely
                    online (UPI, cards, net banking) to confirm it. Your time is
                    held for 10 minutes while you pay. Cancel up to 2 hours
                    before and the full amount is refunded.
                  </>
                ) : (
                  <>
                    The visit is a video call.
                    {fee != null ? ` The fee (${rupees(fee)}) is paid to the doctor directly.` : ""}
                  </>
                )}{" "}
                If this is an emergency, call 112 instead.
              </p>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!slot || saving}
            className="h-12 w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? payOnline
                ? "Opening payment..."
                : "Booking..."
              : slot
                ? payOnline
                  ? `Pay ${rupees(fee)} · ${formatDateTime(slot.startsAt)}`
                  : `Confirm for ${formatDateTime(slot.startsAt)}`
                : "Choose a day and time"}
          </button>
        </form>
      </div>
    </div>
  );
}