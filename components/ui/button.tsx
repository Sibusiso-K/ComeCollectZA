import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "cash" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-green text-on-green border-transparent",
  secondary: "bg-transparent text-ink border-ink",
  cash: "bg-gold text-on-gold border-transparent",
  danger: "bg-transparent text-bad border-bad",
};

// Every button is at least 56px tall, presses to 97% and shows a visible focus ring.
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-5 text-base font-bold transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold " +
        variants[variant] +
        " " +
        className
      }
      {...props}
    />
  );
}
