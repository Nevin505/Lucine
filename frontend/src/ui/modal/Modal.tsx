import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
};

export function Modal({ open, onClose, children, labelledBy }: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-8">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#061318]/62 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative z-10 w-full max-w-[440px] rounded-[18px] border border-white/35 bg-[#e8f2f0] p-7 shadow-[0_24px_60px_rgba(8,20,24,0.4)]"
      >
        {children}
      </div>
    </div>
  );
}
