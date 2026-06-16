import "katex/dist/katex.min.css";

import { useState } from "react";
import { BlockMath, InlineMath } from "react-katex";

export default function MetricInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          inline-flex items-center gap-2
          px-3 py-1.5
          rounded-xl
          text-sm font-medium
          text-slate-700
          bg-slate-100
          hover:bg-slate-200
          transition
        "
      >
        <span className="text-base">ⓘ</span>
        Informasi
      </button>

      {open && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/40
            backdrop-blur-sm
            px-4
          "
          onClick={() => setOpen(false)}
        >
          <div
            className="
              w-full max-w-3xl
              max-h-[85vh]
              overflow-y-auto
              rounded-3xl
              bg-white
              shadow-2xl
              p-6
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="
                      w-9 h-9
                      rounded-xl
                      bg-indigo-100
                      flex items-center justify-center
                      text-indigo-600
                    "
                  >
                    ✨
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Metrik Keputusan AI
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  Framework dan metode scoring yang digunakan untuk menentukan
                  prioritas tugas.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="
                  h-8 w-8
                  rounded-lg
                  text-slate-400
                  hover:bg-slate-100
                  hover:text-slate-700
                  transition
                "
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Eisenhower */}
              <InfoCard title="Eisenhower Matrix">
                <p>
                  Framework prioritas 2×2 berdasarkan <b>urgency</b> dan{" "}
                  <b>importance</b> oleh Dwight Eisenhower. Kemudian
                  dipopulerkan oleh Stephen Covey melalui{" "}
                  <i>The 7 Habits of Highly Effective People (1989)</i>.
                </p>

                <p className="mt-2">
                  Framework ini menjadi dasar kategori AI seperti Q1/Q2/Q3.
                </p>
              </InfoCard>

              {/* WSM */}
              <InfoCard title="WSM (Weighted Sum Model)">
                <p>
                  Metode <b>Multi-Criteria Decision Analysis (MCDA)</b> yang
                  menggabungkan beberapa kriteria menjadi satu nilai prioritas
                  berdasarkan bobot tertentu.
                </p>

                <Reference>
                  Fishburn, P.C. (1967).{" "}
                  <i>Additive Utilities with Incomplete Product Set.</i>
                  <br />
                  Triantaphyllou, E. (2000).{" "}
                  <i>
                    Multi-Criteria Decision Making Methods: A Comparative Study.
                  </i>
                </Reference>
              </InfoCard>

              {/* AHP */}
              <InfoCard title="AHP (Analytic Hierarchy Process)">
                <p>
                  Digunakan untuk menentukan bobot relatif antar kriteria:
                  urgency, importance, effort, dan energy fit.
                </p>

                <Reference>
                  Saaty, T.L. (1980). <i>The Analytic Hierarchy Process.</i>
                </Reference>
              </InfoCard>

              {/* Scoring */}
              <InfoCard title="Skala Scoring">
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    [
                      "Urgency",
                      "5 deadline hari ini, 4 minggu ini, 3 ada deadline, 2 tidak mendesak, 1 santai",
                    ],
                    [
                      "Importance",
                      "5 dampak besar, 4 penting, 3 biasa, 2 pendukung, 1 ringan",
                    ],
                    [
                      "Effort",
                      "5 sangat berat, 4 fokus tinggi, 3 sedang, 2 ringan, 1 sangat ringan",
                    ],
                    [
                      "Energy Fit",
                      "5 cocok sekarang, 4 setelah planning, 3 netral, 2 nanti, 1 tidak cocok",
                    ],
                  ].map(([title, desc]) => (
                    <div
                      key={title}
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        p-3
                        bg-slate-50
                      "
                    >
                      <b className="text-slate-900">{title}</b>

                      <p className="text-xs mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </InfoCard>

              {/* Formula */}
              <InfoCard title="Rumus Perhitungan Prioritas AI">
                <p>
                  Nilai prioritas dihitung menggunakan metode{" "}
                  <b>Weighted Sum Model (WSM)</b> dengan menggabungkan empat
                  kriteria utama.
                </p>

                <div
                  className="
      mt-4
      rounded-2xl
      bg-gradient-to-br
      from-slate-50
      to-white
      border border-slate-200
      p-5
    "
                >
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                    Formula WSM
                  </p>

                  <div
                    className="
    mt-2
    rounded-xl
    bg-white
    border border-slate-100
    px-4 py-5
    text-center
  "
                  >
                    <BlockMath>
  {String.raw`
    \text{Score} =
    0.45U +
    0.30I +
    0.15(6-E) +
    0.10EF
  `}
</BlockMath>
                  </div>

                  <div
                    className="
        mt-4
        pt-4
        border-t border-slate-200
        grid grid-cols-2
        gap-3
        text-sm
      "
                  >
                    <div>
                      <p className="text-slate-500">Faktor utama</p>

                      <p className="font-medium text-slate-800">
                        Urgency + Importance
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Optimasi effort</p>

                      <p className="font-medium text-slate-800">
                        Menggunakan (6 - E)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <div
                    className="
        rounded-xl
        bg-indigo-50
        border border-indigo-100
        p-4
      "
                  >
                    <p className="font-semibold text-indigo-900 mb-2">
                      Bobot Kriteria
                    </p>

                    <div className="space-y-1 text-sm text-slate-700">
                      <p>
                        <b>U</b> — Urgency{" "}
                        <span className="text-slate-500">(45%)</span>
                      </p>

                      <p>
                        <b>I</b> — Importance{" "}
                        <span className="text-slate-500">(30%)</span>
                      </p>

                      <p>
                        <b>E</b> — Effort{" "}
                        <span className="text-slate-500">(15%)</span>
                      </p>

                      <p>
                        <b>EF</b> — Energy Fit{" "}
                        <span className="text-slate-500">(10%)</span>
                      </p>
                    </div>
                  </div>

                  <div
                    className="
        rounded-xl
        bg-emerald-50
        border border-emerald-100
        p-4
      "
                  >
                    <p className="font-semibold text-emerald-900 mb-2">
                      Interpretasi Score
                    </p>

                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-bold">≥ 4.0</span> → Q1{" "}
                        <b>Do First</b>
                      </p>

                      <p>
                        <span className="font-bold">≥ 2.7</span> → Q2{" "}
                        <b>Schedule</b>
                      </p>

                      <p>
                        <span className="font-bold">&lt; 2.7</span> → Q3/Q4{" "}
                        <b>Delegate</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="
      mt-4
      rounded-xl
      bg-slate-50
      border border-slate-200
      p-3
      text-sm
    "
                >
                  <p className="font-semibold text-slate-800 mb-1">Catatan</p>

                  <p>
                    Effort dibalik menggunakan{" "}
                    <code
                      className="
          px-1.5
          py-0.5
          rounded
          bg-white
          border
        "
                    >
                      (6 - E)
                    </code>{" "}
                    karena tugas dengan effort lebih kecil lebih mudah
                    dieksekusi.
                  </p>
                </div>
              </InfoCard>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        rounded-2xl
        border border-slate-200
        p-5
        bg-white
      "
    >
      <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>

      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Reference({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        mt-3
        rounded-xl
        bg-slate-50
        border border-slate-200
        p-3
        text-xs
        text-slate-500
      "
    >
      <span className="font-semibold text-slate-700">Referensi</span>
      <br />
      {children}
    </div>
  );
}
