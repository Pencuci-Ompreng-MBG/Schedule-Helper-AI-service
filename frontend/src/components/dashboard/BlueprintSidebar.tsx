import { FileText, MoreVertical, Plus, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { Blueprint } from "./resultStateTypes";

interface BlueprintSidebarProps {
  blueprints: Blueprint[];
  selectedId: string;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: number) => void;
  onConfirm: () => void;
}

export function BlueprintSidebar({
  blueprints,
  selectedId,
  onAdd,
  onSelect,
  onRemove,
  onConfirm,
}: BlueprintSidebarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden h-fit fade-in-60">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <FileText size={18} className="text-indigo-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Blueprint Tugas</h2>
            <p className="text-xs text-slate-400">
              {blueprints.length} blueprint
            </p>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
        >
          <Plus size={18} className="text-slate-600" />
        </button>
      </div>

      <div className="max-h-175 overflow-y-auto">
        {blueprints.map((blueprint, index) => {
          const isActive = blueprint.id === selectedId;

          return (
            <button
              key={blueprint.id}
              onClick={() => onSelect(blueprint.id)}
              className={`w-full text-left px-5 py-4 border-b border-slate-100 transition ${
                isActive ? "bg-indigo-50/70" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    className={`font-medium ${
                      isActive ? "text-indigo-700" : "text-slate-800"
                    }`}
                  >
                    {blueprint.title}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    {blueprint.subtasks.length} subtasks •{" "}
                    {blueprint.estimated_minutes} menit
                  </p>
                </div>

                <span className="hover:bg-indigo-400 hover:rounded-full p-2 group transition-all duration-300">
                  <Trash2Icon
                    size={16}
                    className="text-slate-400 shrink-0 group-hover:text-white"
                    onClick={() => {
                      onConfirm();
                      onRemove(index);
                    }}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
