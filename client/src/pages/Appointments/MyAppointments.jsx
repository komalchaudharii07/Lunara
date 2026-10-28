import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelAppointment,
  getCheckout,
  getMyAppointments,
  setAppointmentSharing,
  verifyPayment,
} from "../../services/api";
import { formatDateTime, formatTime } from "../../utils/dates";
import { openCheckout } from "../../utils/razorpayCheckout";
import RescheduleBox from "./RescheduleBox";

const MIN = 60 * 1000;
const CANCEL_BEFORE = 2 * 60 * MIN;
const JOIN_BEFORE = 15 * MIN; // the call opens 15 minutes early
const JOIN_AFTER = 30 * MIN; // and stays open 30 minutes after the end

const statusStyle = {
  pending_payment: "bg-amber-50 text-amber-600",
  booked: "bg-green-50 text-green-600",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-500",
};

const rupees = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;

// what to say about the money, if there was any
const paymentLine = (a) => {
  if (!a.amountPaise) return "";
  switch (a.paymentStatus) {
    case "paid":
      return `Paid ${rupees(a.amountPaise)}`;
    case "refunded":
      return `${rupees(a.amountPaise)} refunded (5 to 7 working days to reach your account)`;
    case "refund_processing":
    case "refund_pending":
      return `Refund of ${rupees(a.amountPaise)} in progress`;
    default:
      return "";
  }
};

export default function MyAppointments() {
  const [data, setData] = useState({ appointments: [], doctorId: null, isAdmin: false });
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [movingId, setMovingId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // keeps "Join" buttons and cancel rules fresh while the page stays open
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MIN);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await getMyAppointments());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (a) => {
    const waiting = a.status === "pending_payment";
    const text = waiting
      ? "Let go of this time? You haven't paid yet."
      : `Cancel your appointment with ${a.doctor?.name} on ${formatDateTime(a.startsAt)}?` +
        (a.paymentStatus === "paid" ? " Your payment will be refunded in full." : "");

    if (!window.confirm(text)) return;

    setBusyId(a._id);
    setError("");
    setNotice("");
    try {
      const result = await cancelAppointment(a._id);
      setNotice(result.message || "Appointment cancelled");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  // finish paying for a time that is still held
  const handlePay = async (a) => {
    setBusyId(a._id);
    setError("");
    setNotice("");
    try {
      const { payment } = await getCheckout(a._id);

      await openCheckout({
        payment,
        onPaid: async ({ orderId, paymentId, signature }) => {
          try {
            await verifyPayment({
              appointmentId: a._id,
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            setNotice("Payment received. Your appointment is confirmed.");
          } catch (err) {
            setError(err.message);
          } finally {
            await load();
            setBusyId("");
          }
        },
        onDismiss: () => setBusyId(""),
        onFailed: (message) => setError(message),
      });
    } catch (err) {
      setError(err.message);
      setBusyId("");
      if (err.status === 404) load(); // the hold ran out
    }
  };

  const handleShare = async (a, value) => {
    setBusyId(a._id);
    setError("");

    // show the change at once, undo it if the server says no
    setData((prev) => ({
      ...prev,
      appointments: prev.appointments.map((x) =>
        x._id === a._id ? { ...x, shareReport: value } : x
      ),
    }));

    try {
      await setAppointmentSharing(a._id, value);
    } catch (err) {
      setError(err.message);
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((x) =>
          x._id === a._id ? { ...x, shareReport: !value } : x
        ),
      }));
    } finally {
      setBusyId("");
    }
  };

  const isHeld = (a) =>
    a.status === "pending_payment" && new Date(a.holdExpiresAt).getTime() > now;

  const isUpcoming = (a) =>
    isHeld(a) || (a.status === "booked" && new Date(a.endsAt).getTime() > now);

  const upcoming = data.appointments
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  // a held booking whose 10 minutes ran out is simply gone
  const past = data.appointments.filter(
    (a) => !isUpcoming(a) && a.status !== "pending_payment"
  );
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#df829b]">Your visits</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
            Appointments
          </h1>
        </div>

        <Link
          to="/doctors"
          className="rounded-xl bg-[#e58da4] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d97d96]"
        >
          Book a doctor
        </Link>
      </div>

      {(data.doctorId || data.isAdmin) && (
        <Link
          to="/doctor-portal"
          className="mb-5 block rounded-2xl border border-[#eadde1] bg-white px-5 py-4 text-sm font-medium text-[#292331] hover:border-[#e58da4]"
        >
          Open the doctor portal (schedule and patient appointments) →
        </Link>
      )}

      <div className="mb-5 flex w-fit rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
        {[
          ["upcoming", `Upcoming (${upcoming.length})`],
          ["past", "Past"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
              tab === id ? "bg-[#e58da4] text-white" : "text-gray-500 hover:text-[#d77f97]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-[#f0faf3] px-4 py-3 text-sm text-green-600">
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-sm text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center">
          <div className="text-3xl">🌷</div>
          <p className="mt-3 text-sm font-medium text-[#292331]">
            {tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((a) => {
            const start = new Date(a.startsAt).getTime();
            const end = new Date(a.endsAt).getTime();
            const booked = a.status === "booked";
            const held = isHeld(a);
            const canJoin =
              booked && a.meetingLink && now >= start - JOIN_BEFORE && now <= end + JOIN_AFTER;
            const canCancel = held || (booked && start - now >= CANCEL_BEFORE);
            const money = paymentLine(a);

            return (
              <div
                key={a._id}
                className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#292331]">{a.doctor?.name || "Doctor"}</h3>
                    <p className="text-sm text-[#d77f97]">{a.doctor?.specialization}</p>
                    <p className="mt-1 text-sm text-gray-600">{formatDateTime(a.startsAt)}</p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[a.status] || statusStyle.completed}`}
                  >
                    {held
                      ? "Waiting for payment"
                      : a.status === "cancelled" && a.cancelledBy === "doctor"
                        ? "Cancelled by doctor"
                        : a.status === "booked" && !isUpcoming(a)
                          ? "completed"
                          : a.status.replace("_", " ")}
                  </span>
                </div>

                {a.reason && (
                  <p className="mt-3 text-sm text-gray-500">“{a.reason}”</p>
                )}

                {money && <p className="mt-2 text-xs text-gray-500">{money}</p>}
                {a.razorpayPaymentId && a.paymentStatus === "paid" && (
                  <p className="mt-1 text-xs text-gray-400">Payment reference: {a.razorpayPaymentId}</p>
                )}
                {a.rescheduleCount > 0 && a.status === "booked" && (
                  <p className="mt-1 text-xs text-gray-400">This visit was moved once.</p>
                )}

                {a.prescription?.issuedAt && (
                  <Link
                    to={`/appointments/${a._id}/prescription`}
                    className="mt-4 inline-block rounded-xl border border-[#e58da4] px-4 py-2 text-sm font-medium text-[#d97d96] hover:bg-[#fdf1f4]"
                  >
                    View prescription
                  </Link>
                )}

                {held && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm text-amber-700">
                      This time is held for you until {formatTime(a.holdExpiresAt)}. Pay{" "}
                      {rupees(a.amountPaise)} to confirm it.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handlePay(a)}
                        disabled={busyId === a._id}
                        className="rounded-xl bg-[#e58da4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60"
                      >
                        {busyId === a._id ? "Please wait..." : "Pay now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(a)}
                        disabled={busyId === a._id}
                        className="rounded-xl border border-[#eadde1] bg-white px-4 py-2.5 text-sm text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                      >
                        Let go of this time
                      </button>
                    </div>
                  </div>
                )}

                {booked && (
                  <>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={a.shareReport}
                        disabled={busyId === a._id}
                        onChange={(e) => handleShare(a, e.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#e58da4]"
                      />
                      <span>Share my cycle report with this doctor</span>
                    </label>

                    {a.reportViewedAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        The doctor opened your report on {formatDateTime(a.reportViewedAt)}.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {canJoin ? (
                        <a
                          href={a.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-[#e58da4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d97d96]"
                        >
                          Join video call
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">
                          The video call opens 15 minutes before the visit.
                        </span>
                      )}

                      {canCancel && (a.rescheduleCount || 0) < 1 && (
                        <button
                          type="button"
                          onClick={() => setMovingId(movingId === a._id ? "" : a._id)}
                          className="rounded-xl border border-[#eadde1] px-4 py-2.5 text-sm text-[#292331] hover:border-[#e58da4]"
                        >
                          Reschedule
                        </button>
                      )}

                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(a)}
                          disabled={busyId === a._id}
                          className="rounded-xl border border-[#eadde1] px-4 py-2.5 text-sm text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                        >
                          {a.paymentStatus === "paid" ? "Cancel and refund" : "Cancel"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Cancelling closes 2 hours before.
                        </span>
                      )}
                    </div>

                    {movingId === a._id && (
                      <RescheduleBox
                        appointment={a}
                        onClose={() => setMovingId("")}
                        onDone={async () => {
                          setMovingId("");
                          setNotice("Appointment moved. We emailed you the new time.");
                          await load();
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}