"use client";

import * as React from "react";

const PRESET_COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#f59e0b", 
  "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b"
];

type SimpleColorPickerProps = {
  className?: string;
  value?: string;
  onChange?: (hex: string) => void;
};

export function SimpleColorPicker({ className, value = "#000000", onChange }: SimpleColorPickerProps) {
  const [customColor, setCustomColor] = React.useState(value);
  const [showCustom, setShowCustom] = React.useState(false);

  React.useEffect(() => {
    setCustomColor(value);
  }, [value]);

  const handlePresetClick = (color: string) => {
    onChange?.(color);
    setShowCustom(false);
  };

  const handleCustomChange = (color: string) => {
    setCustomColor(color);
    onChange?.(color);
  };

  return (
    <div className={className}>
      {/* Current color + presets share a row of context */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-6 w-6 shrink-0 rounded-md border border-card-border/20 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="text-xs font-mono opacity-60">{value}</div>
        <button
          className="ml-auto text-[11px] font-medium opacity-60 hover:opacity-90 transition-opacity"
          onClick={() => setShowCustom(!showCustom)}
        >
          {showCustom ? "Presets" : "Custom"}
        </button>
      </div>

      {showCustom ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="h-7 w-12 rounded-md border border-card-border/20 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={customColor}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="flex-1 rounded-md border border-card-border/20 bg-card/30 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]/40"
            placeholder="#000000"
          />
        </div>
      ) : (
        <div className="grid grid-cols-10 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`aspect-square rounded-md transition-transform hover:scale-110 ${
                value === color
                  ? "ring-2 ring-foreground/50 ring-offset-1 ring-offset-[color:var(--background)]"
                  : "border border-card-border/20 hover:border-foreground/20"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handlePresetClick(color)}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SimpleColorPicker;
