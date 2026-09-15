import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getLatestCycle,
} from "../../services/api";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysBetween = (start, end) => {
  const first = new Date(start);
  const second = new Date(end);

  return Math.round(
    (second - first) / (1000 * 60 * 60 * 24)
  );
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [cycle, setCycle] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const [userData, cycleData] =
          await Promise.all([
            getCurrentUser(token),
            getLatestCycle(token),
          ]);

        setUser(userData.user);
        setCycle(cycleData.cycle);
      } catch (error) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const cycleInfo = useMemo(() => {
    if (!cycle?.periodStartDate) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay =
      getDaysBetween(
        cycle.periodStartDate,
        today
      ) + 1;

    if (!cycle.cycleLength) {
      return {
        currentDay:
          currentDay > 0 ? currentDay : null,
        nextPeriod: null,
      };
    }

    const nextPeriod = new Date(
      cycle.periodStartDate
    );

    nextPeriod.setDate(
      nextPeriod.getDate() + cycle.cycleLength
    );

    return {
      currentDay:
        currentDay > 0 ? currentDay : null,
      nextPeriod,
    };
  }, [cycle]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">

      {/* HEADER */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Your personal space
        </p>

        <h1 className="mt-1 font-serif text-3xl font-semibold text-[#292331]">
          Welcome, {user?.name}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Here's a look at your latest cycle and
          wellbeing.
        </p>
      </div>

      {/* CYCLE OVERVIEW */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">

        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">

          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Cycle overview
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-[#292331]">
                Your latest cycle
              </h2>
            </div>

            <button
              onClick={() => navigate("/tracker")}
              className="rounded-xl bg-[#fdf0f3] px-4 py-2 text-xs font-semibold text-[#d97d96] transition hover:bg-[#f9e3e8]"
            >
              Track
            </button>
          </div>

          {!cycle ? (
            <div className="mt-8 rounded-2xl bg-[#fff6f8] p-6">
              <p className="font-medium text-[#292331]">
                Your cycle journey starts here
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Start tracking your period and Lunara
                will learn your cycle pattern.
              </p>

              <button
                onClick={() => navigate("/tracker")}
                className="mt-5 rounded-xl bg-[#e58da4] px-5 py-3 text-sm font-semibold text-white"
              >
                Track your period
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl bg-[#fff6f8] p-5">
                <p className="text-xs text-gray-500">
                  Current cycle
                </p>

                <p className="mt-2 text-2xl font-semibold text-[#292331]">
                  {cycleInfo?.currentDay
                    ? `Day ${cycleInfo.currentDay}`
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Started{" "}
                  {formatDate(
                    cycle.periodStartDate
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff6f8] p-5">
                <p className="text-xs text-gray-500">
                  Cycle length
                </p>

                <p className="mt-2 text-2xl font-semibold text-[#292331]">
                  {cycle.cycleLength
                    ? `${cycle.cycleLength} days`
                    : "Learning"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Based on your history
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff6f8] p-5">
                <p className="text-xs text-gray-500">
                  Next period
                </p>

                <p className="mt-2 text-xl font-semibold text-[#292331]">
                  {cycleInfo?.nextPeriod
                    ? formatDate(
                      cycleInfo.nextPeriod
                    )
                    : "Learning"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Estimated
                </p>
              </div>

            </div>
          )}

        </div>

        {/* LAST PERIOD */}
        <div className="rounded-3xl bg-[#292331] p-6 text-white sm:p-7">

          <p className="text-sm text-white/45">
            Last period
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            {cycle
              ? formatDate(
                cycle.periodStartDate
              )
              : "No data yet"}
          </h2>

          {cycle?.periodEndDate && (
            <p className="mt-2 text-sm text-white/50">
              Ended{" "}
              {formatDate(
                cycle.periodEndDate
              )}
            </p>
          )}

          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="text-xs text-white/40">
              Period length
            </p>

            <p className="mt-1 text-xl font-semibold">
              {cycle?.periodLength
                ? `${cycle.periodLength} days`
                : "Not recorded"}
            </p>
          </div>

        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mt-8">

        <h2 className="text-xl font-semibold text-[#292331]">
          Quick actions
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <button
            onClick={() => navigate("/tracker")}
            className="rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(170,95,120,0.06)] transition hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f3] text-xl text-[#e58da4]">
              +
            </div>

            <h3 className="font-semibold text-[#292331]">
              Track period
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Record your latest period
            </p>
          </button>

          <button
            onClick={() => navigate("/tracker")}
            className="rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(170,95,120,0.06)] transition hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f3] text-xl text-[#e58da4]">
              ♡
            </div>

            <h3 className="font-semibold text-[#292331]">
              Log symptoms
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Keep your wellbeing record
            </p>
          </button>

          <button
            onClick={() => navigate("/ai-chat")}
            className="rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(170,95,120,0.06)] transition hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f3] text-xl text-[#e58da4]">
              ✦
            </div>

            <h3 className="font-semibold text-[#292331]">
              Ask Lunara AI
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Get personalized guidance
            </p>
          </button>

          <button
            onClick={() => navigate("/doctors")}
            className="rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(170,95,120,0.06)] transition hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f3] text-xl text-[#e58da4]">
              ♡
            </div>

            <h3 className="font-semibold text-[#292331]">
              Find a doctor
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Connect with specialists
            </p>
          </button>

        </div>
      </div>

      {/* HEALTH SNAPSHOT */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">

          <p className="text-sm text-gray-400">
            Today's snapshot
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#292331]">
            How are you feeling?
          </h2>

          {cycle?.mood ? (
            <p className="mt-4 text-sm text-gray-500">
              Your latest recorded mood was{" "}
              <span className="font-medium text-[#d97d96]">
                {cycle.mood}
              </span>
              .
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Log your mood and symptoms in the
              tracker to build your health history.
            </p>
          )}

          <button
            onClick={() => navigate("/tracker")}
            className="mt-5 text-sm font-semibold text-[#e58da4]"
          >
            Update health data →
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">

          <p className="text-sm text-gray-400">
            Your progress
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#292331]">
            Building your cycle history
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            The more cycles you track, the better
            Lunara can understand your personal
            pattern and provide estimates.
          </p>

          <button
            onClick={() => navigate("/tracker")}
            className="mt-5 text-sm font-semibold text-[#e58da4]"
          >
            View cycle history →
          </button>

        </div>

      </div>

    </div>
  );
}