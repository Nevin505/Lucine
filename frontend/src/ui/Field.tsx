import type { ComponentProps } from "react";
import { Input } from "./Input";

type Props = {
  id: string;
  label: string;
  error?: string;
} & ComponentProps<typeof Input>;

export function Field({ id, label, error, ...inputProps }: Props) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold tracking-wide text-[#1a333c]"
      >
        {label}
      </label>
      <Input id={id} invalid={Boolean(error)} {...inputProps} />
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}
