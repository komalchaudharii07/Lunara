import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getLatestCycle,
} from "../../services/api";

const DAY = 1000 * 60 * 60 * 24;

// Read only the "YYYY-MM-DD" part and build a LOCAL date (avoids UTC shifts)
const toLocalDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  if (!date) return "—";

  const value = typeof date === "string" ? toLocalDate(date) : date;

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysBetween = (start, end) => Math.round((end - start) / DAY);

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // token is attached by api.js; a real 401 redirects to /login there
        const [userData, cycleData] = await Promise.all([
          getCurrentUser(),
          getLatestCycle(),
        ]);

        setUser(userData.user);
        setCycle(cycleData.cycle);
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const cycleInfo = useMemo(() => {
    if (!cycle?.periodStartDate) {
      return null;
    }

    const start = toLocalDate(cycle.periodStartDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay = getDaysBetween(start, today) + 1;

    if (!cycle.cycleLength) {
      return {
        currentDay: currentDay > 0 ? currentDay : null,
        nextPeriod: null,
        daysLate: 0,
      };
    }

    const nextPeriod = new Date(start);
    nextPeriod.setDate(nextPeriod.getDate() + cycle.cycleLength);

    const daysLate = Math.max(getDaysBetween(nextPeriod, today), 0);

    return {
      currentDay: currentDay > 0 ? currentDay : null,
      nextPeriod,
      daysLate,
    };
  }, [cycle]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  const quickActions = [
    { icon: "+", title: "Track period", text: "Record your latest period", to: "/tracker" },
    { icon: "♡", title: "Log symptoms", text: "Keep your wellbeing record", to: "/tracker" },
    { icon: "✦", title: "Ask Lunara AI", text: "Get personalized guidance", to: "/ai-chat" },
    { icon: "♡", title: "Find care", text: "Doctors and nearby clinics", to: "/doctors" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {loadError && (
        <p role="alert" className="mb-5 text-sm text-red-500">
          {loadError}
        </p>
      )}

      {/* HEADER */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Your personal space
        </p>

        <h1 className="mt-1 font-serif text-3xl font-semibold text-[#292331]">
          {user?.name ? `Welcome, ${user.name}` : "Welcome back"}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Here's a look at your latest cycle and wellbeing.
        </p>
      </div>

      {/* CYCLE OVERVIEW */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Cycle overview</p>

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
                Start tracking your period and Lunara will learn your cycle
                pattern.
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
                <p className="text-xs text-gray-500">Current cycle</p>

                <p className="mt-2 text-2xl font-semibold text-[#292331]">
                  {cycleInfo?.currentDay ? `Day ${cycleInfo.currentDay}` : "—"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Started {formatDate(cycle.periodStartDate)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff6f8] p-5">
                <p className="text-xs text-gray-500">Last cycle length</p>

                <p className="mt-2 text-2xl font-semibold text-[#292331]">
                  {cycle.cycleLength ? `${cycle.cycleLength} days` : "Learning"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Gap before this period
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff6f8] p-5">
                <p className="text-xs text-gray-500">Next period</p>

                <p className="mt-2 text-xl font-semibold text-[#292331]">
                  {cycleInfo?.nextPeriod
                    ? formatDate(cycleInfo.nextPeriod)
                    : "Learning"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {cycleInfo?.daysLate > 0
                    ? `Estimated, ${cycleInfo.daysLate} day${
                        cycleInfo.daysLate > 1 ? "s" : ""
                      } past that date`
                    : "Estimated"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* LAST PERIOD */}
        <div className="rounded-3xl bg-[#292331] p-6 text-white sm:p-7">
          <p className="text-sm text-white/45">Last period</p>

          <h2 className="mt-2 text-2xl font-semibold">
            {cycle ? formatDate(cycle.periodStartDate) : "No data yet"}
          </h2>

          {cycle?.periodEndDate && (
            <p className="mt-2 text-sm text-white/50">
              Ended {formatDate(cycle.periodEndDate)}
            </p>
          )}

          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="text-xs text-white/40">Period length</p>

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
        <h2 className="text-xl font-semibold text-[#292331]">Quick actions</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.to)}
              className="rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(170,95,120,0.06)] transition hover:-translate-y-0.5"
            >
              <div
                aria-hidden="true"
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0f3] text-xl text-[#e58da4]"
              >
                {action.icon}
              </div>

              <h3 className="font-semibold text-[#292331]">{action.title}</h3>

              <p className="mt-1 text-xs text-gray-500">{action.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* HEALTH SNAPSHOT */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
          <p className="text-sm text-gray-400">Today's snapshot</p>

          <h2 className="mt-2 text-xl font-semibold text-[#292331]">
            How are you feeling?
          </h2>

          {cycle?.mood ? (
            <p className="mt-4 text-sm text-gray-500">
              Your latest recorded mood was{" "}
              <span className="font-medium text-[#d97d96]">{cycle.mood}</span>.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Log your mood and symptoms in the tracker to build your health
              history.
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
          <p className="text-sm text-gray-400">Your progress</p>

          <h2 className="mt-2 text-xl font-semibold text-[#292331]">
            Building your cycle history
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            The more cycles you track, the better Lunara can understand your
            personal pattern and provide estimates.
          </p>

          <button
            onClick={() => navigate("/insights")}
            className="mt-5 text-sm font-semibold text-[#e58da4]"
          >
            View your insights →
          </button>
        </div>
      </div>
    </div>
  );
}