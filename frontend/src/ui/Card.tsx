import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: Props) {
  return (
    <div
      className={`rounded-[18px] border border-white/35 bg-[#e8f2f0]/94 p-7 shadow-[0_24px_60px_rgba(8,20,24,0.28)] backdrop-blur-[10px] animate-[rise_700ms_ease_both] [animation-delay:80ms] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
