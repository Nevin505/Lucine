import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid, className = "", ...props }: Props) {
  return (
    <input
      aria-invalid={invalid}
      className={`w-full rounded-xl border border-[#0c1a1f]/12 bg-white px-4 py-3.5 text-[#0c1a1f] outline-none transition focus:border-[#1f7a6c] focus:ring-[3px] focus:ring-[#1f7a6c]/20 aria-invalid:border-[#b42318] ${className}`}
      {...props}
    />
  );
}
