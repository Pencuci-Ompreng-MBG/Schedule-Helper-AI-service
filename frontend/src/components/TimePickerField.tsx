import { Button, Dialog, DialogActions } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { ChangeEvent, useState } from "react";

interface TimePickerFieldProps {
  name: string;
  value?: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TimePickerField({
  name,
  value,
  onChange,
  disabled,
  placeholder = "Pilih waktu",
}: TimePickerFieldProps) {
  const [openClock, setOpenClock] = useState(false);
  const [clockView, setClockView] = useState<"hours" | "minutes">("hours");
  const [selectedTime, setSelectedTime] = useState<Dayjs>(
    dayjs().hour(7).minute(0),
  );

  const handleOpen = () => {
    if (value) {
      setSelectedTime(dayjs(`2026-01-01T${value}`));
    } else {
      setSelectedTime(dayjs().hour(7).minute(0));
    }
    setClockView("hours");
    setOpenClock(true);
  };

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
      setClockView("minutes");
    } else {
      setSelectedTime(selectedTime.minute(val));
    }
  };

  const generateClockNumbers = () => {
    const nums: { val: number; display: string; angle: number }[] = [];
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
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white text-left text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition flex items-center ${
          disabled
            ? "opacity-70 cursor-not-allowed bg-slate-50 text-slate-500"
            : "hover:border-slate-300"
        }`}
      >
        {value || placeholder}
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
        <div className="bg-gradient-to-br from-[#f89977] to-[#e45a55] text-white p-8 pb-6 flex justify-center items-center gap-3 select-none">
          <div className="text-6xl font-bold tracking-wider flex items-center">
            <span
              className={`cursor-pointer transition ${
                clockView === "hours" ? "text-white" : "text-white/60"
              }`}
              onClick={() => setClockView("hours")}
            >
              {selectedTime.format("hh")}
            </span>
            <span className="text-white/60 mx-1 pb-1">:</span>
            <span
              className={`cursor-pointer transition ${
                clockView === "minutes" ? "text-white" : "text-white/60"
              }`}
              onClick={() => setClockView("minutes")}
            >
              {selectedTime.format("mm")}
            </span>
          </div>
          <div className="flex flex-col text-sm font-bold ml-1">
            <button
              type="button"
              className={`transition cursor-pointer hover:opacity-100 ${
                selectedTime.format("A") === "AM"
                  ? "text-white opacity-100"
                  : "text-white opacity-50"
              }`}
              onClick={() => handleAmPm("AM")}
            >
              AM
            </button>
            <button
              type="button"
              className={`transition cursor-pointer hover:opacity-100 ${
                selectedTime.format("A") === "PM"
                  ? "text-white opacity-100"
                  : "text-white opacity-50"
              }`}
              onClick={() => handleAmPm("PM")}
            >
              PM
            </button>
          </div>
        </div>

        <div className="pt-8 pb-6 flex justify-center bg-white select-none">
          <div className="relative w-[240px] h-[240px] bg-[#f0f0f0] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#e45a55] rounded-full absolute z-10" />
            <div
              className="absolute w-[2px] bg-[#e45a55] origin-bottom z-10 transition-transform duration-300 ease-out"
              style={{
                height: "92px",
                bottom: "120px",
                left: "calc(50% - 1px)",
                transform: `rotate(${getHandAngle()}deg)`,
              }}
            />
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
                  name,
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
    </>
  );
}
