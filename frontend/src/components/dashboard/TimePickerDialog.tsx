import { Button, Dialog, DialogActions } from "@mui/material";
import type { Dayjs } from "dayjs";

interface ClockNumber {
  val: number;
  display: string;
  angle: number;
}

interface TimePickerDialogProps {
  open: boolean;
  onClose: () => void;
  clockView: "hours" | "minutes";
  onClockViewChange: (view: "hours" | "minutes") => void;
  selectedTime: Dayjs;
  onAmPm: (meridiem: "AM" | "PM") => void;
  onNumberClick: (val: number) => void;
  clockNumbers: ClockNumber[];
  currentHour12: number;
  currentMinute: number;
  handAngle: number;
  onSetTime: (time: string) => void;
}

export function TimePickerDialog({
  open,
  onClose,
  clockView,
  onClockViewChange,
  selectedTime,
  onAmPm,
  onNumberClick,
  clockNumbers,
  currentHour12,
  currentMinute,
  handAngle,
  onSetTime,
}: TimePickerDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
            onClick={() => onClockViewChange("hours")}
          >
            {selectedTime.format("hh")}
          </span>
          <span className="text-white/60 mx-1 pb-1">:</span>
          <span
            className={`cursor-pointer transition ${clockView === "minutes" ? "text-white" : "text-white/60"}`}
            onClick={() => onClockViewChange("minutes")}
          >
            {selectedTime.format("mm")}
          </span>
        </div>
        <div className="flex flex-col text-sm font-bold ml-1">
          <button
            type="button"
            className={`transition cursor-pointer hover:opacity-100 ${selectedTime.format("A") === "AM" ? "text-white opacity-100" : "text-white opacity-50"}`}
            onClick={() => onAmPm("AM")}
          >
            AM
          </button>
          <button
            type="button"
            className={`transition cursor-pointer hover:opacity-100 ${selectedTime.format("A") === "PM" ? "text-white opacity-100" : "text-white opacity-50"}`}
            onClick={() => onAmPm("PM")}
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
              transform: `rotate(${handAngle}deg)`,
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
                type="button"
                key={num.val}
                onClick={() => onNumberClick(num.val)}
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
          onClick={onClose}
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
          onClick={() => onSetTime(selectedTime.format("HH:mm"))}
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
  );
}
