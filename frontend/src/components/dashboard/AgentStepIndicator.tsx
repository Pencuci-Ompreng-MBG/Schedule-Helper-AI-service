"use client";

import { Check, Loader2 } from "lucide-react";

interface AgentStepIndicatorProps {
  // Sekarang menerima format seperti: "counselor" atau "counselor:stress"
  currentStep: string | null;
}

const STEPS = [
  { id: "router", label: "Router", desc: "Analyzing Intent" },
  { id: "counselor", label: "Counselor", desc: "Consultation" },
  { id: "prioritizer", label: "Prioritizer", desc: "Sorting Tasks" },
  { id: "scheduler", label: "Scheduler", desc: "Generating Schedule" },
];

export function AgentStepIndicator({ currentStep }: AgentStepIndicatorProps) {
  // 1. Pecah string untuk mendapatkan base step dan optional ID (jika ada)
  const [baseStep, optionalId] = (currentStep || "router").split(":");

  // 2. Tentukan status menggunakan baseStep, bukan full currentStep
  const getStepStatus = (stepId: string) => {
    const stepOrder = ["router", "counselor", "prioritizer", "scheduler"];
    const currentIndex = stepOrder.indexOf(baseStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) {
      return "completed";
    }
    if (stepIndex === currentIndex) {
      return "active";
    }
    return "pending";
  };

  // 3. Fungsi untuk mengubah deskripsi sesuai dengan optional ID yang sedang aktif
  const getDynamicDescription = (step: (typeof STEPS)[0]) => {
    // Jika step ini sedang aktif dan memiliki optionalId
    if (step.id === baseStep && optionalId) {
      if (step.id === "counselor" && optionalId === "stress") {
        return "Handling Stress Issues"; // Ubah teks sesuai kebutuhan
      }
      if (step.id === "prioritizer" && optionalId === "manage_task") {
        return "Managing User Tasks"; // Ubah teks sesuai kebutuhan
      }
    }
    // Jika tidak ada optional ID, kembalikan deskripsi bawaan
    return step.desc;
  };

  return (
    <div className="w-full bg-[#FAF9FF] border border-[#ECE9FC] rounded-2xl p-4 sm:p-5 mb-4 shadow-sm animate-fadeIn">
      {/* Label atas */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-[#8A38F5] uppercase tracking-wider">
          AI Workflow Processing
        </span>
        <span className="text-[11px] text-[#717182] flex items-center gap-1.5 font-medium">
          {/* <Loader2 className="w-3 h-3 animate-spin text-[#8A38F5]" /> */}
          Multi-agent orchestration steps
        </span>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-between relative w-full gap-2 overflow-x-auto py-1">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const currentDesc = getDynamicDescription(step);

          return (
            <div
              key={step.id}
              className="flex flex-1 items-center last:flex-initial"
            >
              {/* Node Step */}
              <div className="flex items-center gap-2.5">
                {/* Bulatan Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-500 border ${
                    status === "completed"
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                      : status === "active"
                        ? "bg-[#8A38F5] border-[#8A38F5] text-white shadow-md shadow-purple-100"
                        : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {status === "completed" ? (
                    <Check className="w-4 h-4 stroke-[3px]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Teks Label */}
                <div className="flex flex-col text-left shrink-0">
                  <span
                    className={`text-xs font-bold transition-colors ${
                      status === "active"
                        ? "text-[#0A0A0A]"
                        : status === "completed"
                          ? "text-slate-500 font-semibold"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9.5px] text-[#717182] leading-tight transition-all duration-300">
                    {currentDesc}
                  </span>
                </div>
              </div>

              {/* Garis Koneksi antar Node */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 mx-3 min-w-[20px] h-[2px] bg-gray-100 rounded-full relative">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-in-out bg-purple-500 rounded-full ${
                      status === "completed" ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
