import { Button, Dialog, DialogActions } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import {
  Check,
  CheckCircle2,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import type { TaskData } from "./resultStateTypes";

interface TaskEditorProps {
  taskData: TaskData;
  subtasks: string[];
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAddSubtask: () => void;
  onSubtaskChange: (index: number, value: string) => void;
  onRemoveSubtask: (index: number) => void;
  onApprove?: () => void;
  blueprintAvailable: boolean;
}

export function TaskEditor({
  taskData,
  subtasks,
  blueprintAvailable,
  onChange,
  onAddSubtask,
  onSubtaskChange,
  onRemoveSubtask,
  onApprove,
}: TaskEditorProps) {
  const [onEdit, setOnEdit] = useState(false);
  const [openClock, setOpenClock] = useState(false);
  const [clockView, setClockView] = useState<"hours" | "minutes">("hours");

  const [selectedTime, setSelectedTime] = useState<Dayjs>(
    taskData.deadline?.time
      ? dayjs(`2026-01-01T${taskData.deadline.time}`)
      : dayjs().hour(7).minute(6),
  );

  const handleAmPm = (meridiem: "AM" | "PM") => {
    const currentHour = selectedTime.hour();
    if (meridiem === "AM" && currentHour >= 12) {
      setSelectedTime(selectedTime.subtract(12, "hour"));
    } else if (meridiem === "PM" && currentHour < 12) {
      setSelectedTime(selectedTime.add(12, "hour"));
    }
  };

  const handleNumberClick = (val: number) => {
    if (clockView === "hours") {
      const isPm = selectedTime.hour() >= 12;
      let newHour = val === 12 ? 0 : val;
      if (isPm) newHour += 12;

      setSelectedTime(selectedTime.hour(newHour));
      setClockView("minutes"); // Auto switch to minutes
    } else {
      setSelectedTime(selectedTime.minute(val));
    }
  };

  const generateClockNumbers = () => {
    const nums = [];
    if (clockView === "hours") {
      for (let i = 1; i <= 12; i++) {
        const angleDeg = i * 30 - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        nums.push({ val: i, display: i.toString(), angle: angleRad });
      }
    } else {
      for (let i = 0; i < 60; i += 5) {
        const angleDeg = i * 6 - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        nums.push({
          val: i,
          display: i === 0 ? "00" : i.toString(),
          angle: angleRad,
        });
      }
    }
    return nums;
  };

  const getHandAngle = () => {
    if (clockView === "hours") {
      return (selectedTime.hour() % 12) * 30;
    }
    return selectedTime.minute() * 6;
  };

  const clockNumbers = generateClockNumbers();
  const currentHour12 = selectedTime.hour() % 12 || 12;
  const currentMinute = selectedTime.minute();

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-900">
            <input
              name="title"
              type="text"
              value={taskData.title ?? "Untitled Task"}
              onChange={onChange}
              disabled={!onEdit}
              className={`bg-transparent outline-none w-full transition-all ${
                onEdit ? "rounded-xl border-2 border-slate-400 p-2" : ""
              }`}
            />
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Review blueprint sebelum dijadwalkan
          </p>
        </div>

        {onEdit ? (
          <button
            className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
            onClick={() => setOnEdit(!onEdit)}
          >
            <Check size={18} className="text-slate-600" />
          </button>
        ) : (
          <button
            className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
            onClick={() => setOnEdit(!onEdit)}
          >
            <Pencil size={18} className="text-slate-600" />
          </button>
        )}
      </div>

      {blueprintAvailable ? (
        <div className="flex h-full text-3xl text-center justify-center items-center">
          <span>Belum ada tugas yang ditambahkan</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Estimasi Waktu
              </label>

              <div className="flex relative items-center gap-2">
                <input
                  type="number"
                  name="estimated_minutes"
                  value={taskData.estimated_minutes ?? ""}
                  onChange={onChange}
                  disabled={!onEdit}
                  className={`w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-50" : ""}`}
                />

                <span className="text-sm text-slate-400">menit</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Prioritas
              </label>

              <select
                name="priority"
                value={taskData.priority ?? 3}
                onChange={onChange}
                disabled={!onEdit}
                className={`w-full h-12 rounded-2xl border text-white border-slate-200 px-4 ${taskData.priority === 1 ? "bg-red-500" : taskData.priority === 2 ? "bg-orange-500" : "bg-green-500"} outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-90 cursor-not-allowed" : ""}`}
              >
                <option value={1} className="bg-red-500">
                  Sangat Penting
                </option>
                <option value={2} className="bg-orange-500">
                  Penting
                </option>
                <option value={3} className="bg-green-500">
                  Biasa
                </option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Subtasks</h3>
                  <p className="text-sm text-slate-400">Bisa diedit langsung</p>
                </div>

                <button
                  onClick={onAddSubtask}
                  disabled={!onEdit}
                  className={`flex items-center gap-2 text-sm font-medium text-indigo-600 transition ${!onEdit ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-700"}`}
                >
                  <Plus size={16} />
                  Tambah
                </button>
              </div>

              <div className="space-y-3">
                {subtasks.map((subtask, index) => (
                  <div
                    key={`subtask-${index}`}
                    className={`group flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3 hover:border-slate-300 transition`}
                  >
                    {/* Drag-and-drop dihapus, icon Grip dibiarkan statis */}
                    <GripVertical
                      size={16}
                      className="text-slate-300 cursor-default"
                    />

                    <CheckCircle2
                      size={18}
                      className="text-indigo-500 shrink-0"
                    />

                    <input
                      value={subtask ?? ""}
                      onChange={(e) => onSubtaskChange(index, e.target.value)}
                      disabled={!onEdit}
                      className={`flex-1 bg-transparent rounded-sm p-1 text-sm text-slate-700 ${onEdit ? "outline-1 outline-slate-400 focus:outline-indigo-500" : "outline-none"}`}
                    />

                    {onEdit && (
                      <button className="opacity-0 group-hover:opacity-100 transition">
                        <Pencil size={16} className="text-slate-400" />
                      </button>
                    )}

                    {onEdit && (
                      <button
                        onClick={() => onRemoveSubtask(index)}
                        className="opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Deadline
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="deadline_date"
                  value={taskData.deadline?.date ?? ""}
                  onChange={onChange}
                  disabled={!onEdit}
                  className={`w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
                />

                <button
                  type="button"
                  onClick={() => {
                    setClockView("hours");
                    setOpenClock(true);
                  }}
                  disabled={!onEdit}
                  className={`w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white text-left text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition flex items-center ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-50 text-slate-500" : "hover:border-slate-300"}`}
                >
                  {taskData.deadline?.time || "Pilih waktu"}
                </button>

                <Dialog
                  open={openClock}
                  onClose={() => setOpenClock(false)}
                  sx={{
                    "& .MuiDialog-paper": {
                      borderRadius: "16px",
                      padding: 0,
                      width: "320px",
                      overflow: "hidden",
                      margin: "16px",
                    },
                  }}
                >
                  {/* Header custom matching the image */}
                  <div className="bg-gradient-to-br from-[#f89977] to-[#e45a55] text-white p-8 pb-6 flex justify-center items-center gap-3 select-none">
                    <div className="text-6xl font-bold tracking-wider flex items-center">
                      <span
                        className={`cursor-pointer transition ${clockView === "hours" ? "text-white" : "text-white/60"}`}
                        onClick={() => setClockView("hours")}
                      >
                        {selectedTime.format("hh")}
                      </span>
                      <span className="text-white/60 mx-1 pb-1">:</span>
                      <span
                        className={`cursor-pointer transition ${clockView === "minutes" ? "text-white" : "text-white/60"}`}
                        onClick={() => setClockView("minutes")}
                      >
                        {selectedTime.format("mm")}
                      </span>
                    </div>
                    <div className="flex flex-col text-sm font-bold ml-1">
                      <button
                        type="button"
                        className={`transition cursor-pointer hover:opacity-100 ${selectedTime.format("A") === "AM" ? "text-white opacity-100" : "text-white opacity-50"}`}
                        onClick={() => handleAmPm("AM")}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        className={`transition cursor-pointer hover:opacity-100 ${selectedTime.format("A") === "PM" ? "text-white opacity-100" : "text-white opacity-50"}`}
                        onClick={() => handleAmPm("PM")}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Custom Analog Clock */}
                  <div className="pt-8 pb-6 flex justify-center bg-white select-none">
                    <div className="relative w-[240px] h-[240px] bg-[#f0f0f0] rounded-full flex items-center justify-center">
                      {/* Center Dot */}
                      <div className="w-2 h-2 bg-[#e45a55] rounded-full absolute z-10" />

                      {/* Clock Hand */}
                      <div
                        className="absolute w-[2px] bg-[#e45a55] origin-bottom z-10 transition-transform duration-300 ease-out"
                        style={{
                          height: "92px",
                          bottom: "120px",
                          left: "calc(50% - 1px)",
                          transform: `rotate(${getHandAngle()}deg)`,
                        }}
                      />

                      {/* Numbers */}
                      {clockNumbers.map((num) => {
                        const isSelected =
                          clockView === "hours"
                            ? num.val === currentHour12
                            : num.val === currentMinute;

                        return (
                          <button
                            key={num.val}
                            onClick={() => handleNumberClick(num.val)}
                            className={`absolute w-8 h-8 flex items-center justify-center text-sm rounded-full z-20 transition-colors ${
                              isSelected
                                ? "bg-[#e45a55] text-white"
                                : "text-slate-700 hover:bg-slate-200/60"
                            }`}
                            style={{
                              left: `calc(50% + ${Math.cos(num.angle) * 92}px - 16px)`,
                              top: `calc(50% + ${Math.sin(num.angle) * 92}px - 16px)`,
                            }}
                          >
                            {num.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <DialogActions
                    sx={{
                      padding: "8px 24px 20px 24px",
                      justifyContent: "flex-end",
                      gap: 1,
                    }}
                  >
                    <Button
                      onClick={() => setOpenClock(false)}
                      sx={{
                        color: "#e45a55",
                        fontWeight: "bold",
                        fontSize: "14px",
                        padding: "6px 16px",
                      }}
                    >
                      CLOSE
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        onChange({
                          target: {
                            name: "deadline_time",
                            value: selectedTime.format("HH:mm"),
                          },
                        } as ChangeEvent<HTMLInputElement>);
                        setOpenClock(false);
                      }}
                      sx={{
                        backgroundColor: "#e45a55",
                        borderRadius: "24px",
                        padding: "6px 20px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        "&:hover": { backgroundColor: "#d14945" },
                        boxShadow: "none",
                      }}
                    >
                      SET
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={!onEdit}
                className={`flex-1 h-12 rounded-2xl border border-slate-200 font-medium text-slate-700 transition ${!onEdit ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}
              >
                Simpan Revisi
              </button>

              <button
                onClick={onApprove}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-medium shadow-sm"
              >
                Approve & Jadwalkan
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
