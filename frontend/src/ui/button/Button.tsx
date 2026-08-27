import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    "rounded-full bg-gradient-to-br from-[#1f7a6c] to-[#2a9b89] text-white hover:-translate-y-px disabled:cursor-wait disabled:opacity-70",
  secondary:
    "rounded-full border border-[#0c1a1f]/12 bg-transparent text-[#1a333c] hover:bg-[#0c1a1f]/5",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`cursor-pointer px-5 py-3.5 font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
