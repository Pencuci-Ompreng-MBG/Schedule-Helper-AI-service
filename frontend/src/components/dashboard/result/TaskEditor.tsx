import {
  Pencil,
  Check,
  Plus,
  GripVertical,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import React, { type ChangeEvent, useState } from "react";
import { TaskData } from "./resultStateTypes";
import { TimePickerField } from "@/components/TimePickerField";

interface TaskEditorProps {
  taskData: TaskData;
  subtasks: string[];
  blueprintAvailable: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAddSubtask: () => void;
  onSubtaskChange: (index: number, value: string) => void;
  onRemoveSubtask: (index: number) => void;
  onSimpanRevisi?: () => void;
  onApprove?: () => void;
}

export function TaskEditor({
  taskData,
  subtasks,
  blueprintAvailable,
  onChange,
  onAddSubtask,
  onSubtaskChange,
  onRemoveSubtask,
  onSimpanRevisi,
  onApprove,
}: TaskEditorProps) {
  const [onEdit, setOnEdit] = useState(false);

  if (blueprintAvailable) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm w-full mx-auto flex h-40 text-lg text-slate-400 text-center justify-center items-center">
        <span>Belum ada tugas yang ditambahkan</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm w-full mx-auto max-h-[85vh] overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between gap-4 mb-6">
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
        <button
          className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
          onClick={() => {
            setOnEdit(!onEdit);
            if (onSimpanRevisi && onEdit) {
              onSimpanRevisi();
              setOnEdit(false);
            }
          }}
        >
          {onEdit ? (
            <Check size={18} className="text-slate-600" />
          ) : (
            <Pencil size={18} className="text-slate-600" />
          )}
        </button>
      </div>

      {/* REASONING DARI AI */}
      {taskData.priority_reasoning && (
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl mb-6">
          <p className="text-xs text-indigo-500 font-bold tracking-wider uppercase mb-1">
            ✨ Kata AI
          </p>
          <p className="text-sm text-indigo-900 leading-relaxed">
            {taskData.priority_reasoning}
          </p>
        </div>
      )}

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
            className={`w-full h-12 rounded-2xl border text-white border-slate-200 px-4 outline-none focus:ring-2 focus:ring-indigo-500/20 ${
              taskData.priority === 1
                ? "bg-red-500"
                : taskData.priority === 2
                  ? "bg-orange-500"
                  : "bg-green-500"
            } ${!onEdit ? "opacity-90 cursor-not-allowed" : ""}`}
          >
            <option value={1} className="bg-red-500 text-white">
              Sangat Penting
            </option>
            <option value={2} className="bg-orange-500 text-white">
              Penting
            </option>
            <option value={3} className="bg-green-500 text-white">
              Biasa
            </option>
          </select>
        </div>
      </div>

      {/* Preferensi Waktu & Kategori */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Waktu Favorit
          </label>
          <select
            name="preferred_window"
            value={taskData.preferred_window ?? "bebas"}
            onChange={onChange}
            disabled={!onEdit}
            className={`w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-50 text-slate-500" : "bg-white text-slate-700"}`}
          >
            <option value="pagi">Pagi</option>
            <option value="siang">Siang</option>
            <option value="sore">Sore</option>
            <option value="malam">Malam</option>
            <option value="bebas">Bebas</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Batas Deadline
          </label>
          <input
            type="date"
            name="deadline_date"
            value={taskData.deadline?.date ?? ""}
            onChange={onChange}
            disabled={!onEdit}
            className={`w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-50 text-slate-500" : "bg-white"}`}
          />
        </div>
      </div>

      {/* Lock Time Section */}
      <div className="border border-slate-200 rounded-2xl p-4 mb-6 bg-slate-50/50">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_locked_time"
            checked={taskData.is_locked_time}
            onChange={onChange}
            disabled={!onEdit}
            className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
          />
          <span className="font-semibold text-slate-700">
            Kunci Waktu Penjadwalan Spesifik
          </span>
        </label>

        {taskData.is_locked_time && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide">
                Tgl. Pelaksanaan
              </label>
              <input
                type="date"
                name="locked_date"
                value={taskData.locked_start_time.date ?? ""}
                onChange={onChange}
                disabled={!onEdit}
                className={`w-full h-12 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 ${!onEdit ? "opacity-70 cursor-not-allowed bg-slate-100" : "bg-white"}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide">
                Jam Mulai
              </label>
              <TimePickerField
                name="locked_time"
                value={taskData.locked_start_time.time}
                onChange={onChange}
                disabled={!onEdit}
                placeholder="09:00"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">Subtasks</h3>
              <p className="text-sm text-slate-400">Langkah pengerjaan</p>
            </div>
            <button
              onClick={onAddSubtask}
              disabled={!onEdit}
              className={`flex items-center gap-2 text-sm font-medium text-indigo-600 transition ${!onEdit ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-700"}`}
            >
              <Plus size={16} /> Tambah
            </button>
          </div>
          <div className="space-y-3">
            {subtasks.map((subtask, index) => (
              <div
                key={index}
                className="group flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3 hover:border-slate-300 transition"
              >
                <GripVertical
                  size={16}
                  className="text-slate-300 cursor-default"
                />
                <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                <input
                  value={subtask ?? ""}
                  onChange={(e) => onSubtaskChange(index, e.target.value)}
                  disabled={!onEdit}
                  className={`flex-1 bg-transparent rounded-sm p-1 text-sm text-slate-700 ${onEdit ? "outline-1 outline-slate-400 focus:outline-indigo-500" : "outline-none"}`}
                />
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

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (onSimpanRevisi) onSimpanRevisi();
              setOnEdit(false);
            }}
            disabled={!onEdit}
            className={`flex-1 h-12 rounded-2xl border border-indigo-200 bg-indigo-50 font-semibold text-indigo-700 transition shadow-sm ${!onEdit ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-100"}`}
          >
            Simpan Revisi
          </button>
          <button
            onClick={onApprove}
            disabled={onEdit}
            className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            Approve & Jadwalkan
          </button>
        </div>
      </div>
    </div>
  );
}
