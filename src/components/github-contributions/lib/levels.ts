// violet ramp — matches --accent, not GitHub green
// ponytail: opacity multipliers over one color give a smoother, more visible ramp
// than mixing foreground-white + violet at low alphas (which washes out on dark bg).
// Lives outside the "use client" grid so the server component can read the values.
export const LEVEL_FILL = "rgb(143,145,224)";
export const LEVEL_OPACITY = [0.06, 0.32, 0.55, 0.78, 1] as const;
