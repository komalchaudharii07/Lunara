import { useEffect, useState } from "react";
import { getDoctors } from "../../services/api";
import NearbyMap from "../../components/doctors/NearbyMap";
import { Link } from "react-router-dom";
import SecureImage from "../../components/common/SecureImage";

const careOptions = [
  {
    id: "gynecologist",
    title: "Gynecologist",
    description: "General women's health & reproductive care",
    icon: "🩷",
  },
  {
    id: "pcos",
    title: "PCOS / PCOD",
    description: "Hormonal concerns & irregular periods",
    icon: "🌸",
  },
  {
    id: "pregnancy",
    title: "Pregnancy & Fertility",
    description: "Pregnancy planning & fertility support",
    icon: "🤍",
  },
  {
    id: "periods",
    title: "Period Problems",
    description: "Painful, heavy or irregular periods",
    icon: "🌷",
  },
  {
    id: "general",
    title: "Women's General Health",
    description: "General health concerns & guidance",
    icon: "✨",
  },
  {
    id: "urgent",
    title: "Urgent Care",
    description: "For symptoms needing prompt attention",
    icon: "🩺",
  },
];

export default function Doctors() {
  const [selectedCare, setSelectedCare] = useState(null);
  const [activeTab, setActiveTab] = useState("online");

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDoctors = async () => {
      try {

        const data = await getDoctors();
        setDoctors(data.doctors || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  const selectedOption = careOptions.find(
    (option) => option.id === selectedCare
  );

  const filteredDoctors = doctors.filter((doctor) => {
    if (!selectedCare) return true;

    // treat the British spelling "gynaecologist" the same as "gynecologist"
    const specialization = (doctor.specialization?.toLowerCase() || "")
      .replace("gynaecolog", "gynecolog");

    if (selectedCare === "gynecologist") {
      return (
        specialization.includes("gynecologist") ||
        specialization.includes("obstetrician")
      );
    }

    if (selectedCare === "pcos") {
      return (
        specialization.includes("pcos") ||
        specialization.includes("pcod") ||
        specialization.includes("women")
      );
    }

    if (selectedCare === "pregnancy") {
      return (
        specialization.includes("obstetric") ||
        specialization.includes("pregnancy") ||
        specialization.includes("fertility")
      );
    }

    if (selectedCare === "periods") {
      return (
        specialization.includes("gynecologist") ||
        specialization.includes("women")
      );
    }

    if (selectedCare === "general") {
      return specialization.includes("women");
    }

    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      {/* HEADER */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Care when you need it
        </p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Find the right care
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Tell Lunara what you need help with and we'll help
          you find the right healthcare option.
        </p>
      </div>

      {/* CARE SELECTION */}
      <section className="mb-10">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-[#292331]">
            What do you need help with?
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Choose the option that best matches your concern.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {careOptions.map((option) => {
            const isSelected = selectedCare === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setSelectedCare(option.id)}
                aria-pressed={isSelected}
                className={`group rounded-3xl border p-5 text-left transition ${isSelected
                  ? "border-[#e58da4] bg-[#fff4f7] shadow-[0_12px_35px_rgba(170,95,120,0.12)]"
                  : "border-[#eee3e6] bg-white hover:-translate-y-0.5 hover:border-[#efb6c4] hover:shadow-[0_12px_35px_rgba(170,95,120,0.08)]"
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${isSelected
                      ? "bg-[#e58da4]"
                      : "bg-[#fdf1f4]"
                      }`}
                  >
                    {option.icon}
                  </div>

                  {isSelected && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e58da4] text-xs text-white">
                      ✓
                    </span>
                  )}
                </div>

                <h3 className="mt-4 font-semibold text-[#292331]">
                  {option.title}
                </h3>

                <p className="mt-1 text-sm leading-5 text-gray-400">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* RESULTS */}
      {/* URGENT CARE: emergency numbers first, then hospitals nearby */}
      {selectedCare === "urgent" && (
        <section>
          <div
            role="alert"
            className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6"
          >
            <h2 className="text-xl font-semibold text-red-700">
              If this is an emergency, get help now
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700">
              Call <strong>112</strong> (emergency) or <strong>108</strong>{" "}
              (ambulance), or go to the nearest hospital. Don&apos;t wait for
              an online consultation if you have very heavy bleeding (soaking
              a pad every hour), severe or sudden pain, fainting, bleeding or
              pain during pregnancy, or fever with pelvic pain.
            </p>

            <p className="mt-2 text-sm leading-6 text-red-700">
              If you are thinking about harming yourself, call Tele-MANAS on{" "}
              <strong>14416</strong>.
            </p>
          </div>

          <div className="mb-5">
            <h3 className="text-lg font-semibold text-[#292331]">
              Hospitals and clinics near you
            </h3>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-5">
            <NearbyMap careType="urgent" />
          </div>
        </section>
      )}

      {selectedCare && selectedCare !== "urgent" && (
        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#df829b]">
                Your selected care
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-[#292331]">
                {selectedOption?.title}
              </h2>
            </div>

            {/* TABS */}
            <div className="flex w-fit rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
              <button
                onClick={() => setActiveTab("online")}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${activeTab === "online"
                  ? "bg-[#e58da4] text-white"
                  : "text-gray-500 hover:text-[#d77f97]"
                  }`}
              >
                Online
              </button>

              <button
                onClick={() => setActiveTab("nearby")}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${activeTab === "nearby"
                  ? "bg-[#e58da4] text-white"
                  : "text-gray-500 hover:text-[#d77f97]"
                  }`}
              >
                Nearby
              </button>
            </div>
          </div>

          {/* ONLINE */}
          {activeTab === "online" && (
            <section>
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-[#292331]">
                  Online Consultation
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Consult with a women's health professional from
                  anywhere.
                </p>
              </div>

              {loading && (
                <div className="rounded-3xl bg-white p-10 text-center">
                  <p className="text-sm text-gray-400">
                    Loading doctors...
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}

              {!loading &&
                !error &&
                filteredDoctors.length === 0 && (
                  <div className="rounded-3xl bg-white p-10 text-center">
                    <div className="text-3xl">🌸</div>

                    <p className="mt-3 text-sm font-medium text-[#292331]">
                      No matching doctors available right now
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Try another care category.
                    </p>
                  </div>
                )}

              {!loading &&
                filteredDoctors.length > 0 && (
                  <div className="grid gap-5 md:grid-cols-2">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor._id}
                        className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <SecureImage fileId={doctor.photo} name={doctor.name} size={56} />

                            <div>
                              <h3 className="font-semibold text-[#292331]">
                                {doctor.name}
                              </h3>

                              <p className="mt-1 text-sm text-[#d77f97]">
                                {doctor.specialization}
                              </p>
                            </div>
                          </div>

                          {doctor.available && (
                            <span className="whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                              Available
                            </span>
                          )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#f2e8eb] pt-5">
                          <div>
                            <p className="text-xs text-gray-400">
                              Experience
                            </p>

                            <p className="mt-1 text-sm font-medium text-[#292331]">
                              {doctor.experience != null ? `${doctor.experience} years` : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">
                              Consultation
                            </p>

                            <p className="mt-1 text-sm font-medium text-[#292331]">
                              {doctor.consultationFee != null
                                ? `₹${Number(doctor.consultationFee).toLocaleString("en-IN")}`
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                          {doctor.qualification}
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <Link
                            to={`/doctors/${doctor._id}`}
                            className="flex h-11 items-center justify-center rounded-xl border border-[#eadde1] text-sm font-medium text-[#292331] hover:border-[#e58da4]"
                          >
                            View profile
                          </Link>
                          <Link
                            to={`/doctors/${doctor._id}/book`}
                            className="flex h-11 items-center justify-center rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96]"
                          >
                            Book
                          </Link>
                        </div>
                       
                      </div>
                    ))}
                  </div>
                )}
            </section>
          )}

          {/* NEARBY */}
          {activeTab === "nearby" && (
            <section>
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-[#292331]">
                  Nearby Care
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Find healthcare facilities around your current
                  location.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-4 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-5">
                <NearbyMap careType={selectedCare} />
              </div>
            </section>
          )}
        </section>
      )}

      {/* NOTHING SELECTED */}
      {!selectedCare && (
        <div className="rounded-3xl border border-[#f0e3e7] bg-white/70 px-6 py-10 text-center">
          <div className="text-3xl">🌷</div>

          <p className="mt-3 text-sm font-semibold text-[#292331]">
            Choose a care option to continue
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Lunara will show relevant doctors and nearby care.
          </p>
        </div>
      )}
    </div>
  );
}