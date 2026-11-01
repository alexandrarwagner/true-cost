"use client";

import { useState } from "react";

interface Props {
  id: string;
  on: boolean;
  disabled: boolean;
  describedBy: string;
  label: string;
  onChange: (on: boolean) => void;
}

/**
 * A real switch that flips at once and settles on the server's answer. The page's state
 * arrives with the next estimate; until then the control shows what was just asked for.
 */
export function LeverSwitch({ id, on, disabled, describedBy, label, onChange }: Props) {
  const [state, setState] = useState({ on, checked: on });
  // Derived state adjusted during render: when the server's value changes, follow it.
  if (state.on !== on) setState({ on, checked: on });
  return (
    <label className="flex items-center gap-2">
      <input
        id={`lever-${id}`}
        type="checkbox"
        role="switch"
        className="h-6 w-6"
        checked={state.checked}
        disabled={disabled}
        aria-checked={state.checked}
        aria-describedby={describedBy}
        onChange={(e) => {
          setState({ on, checked: e.target.checked });
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}
