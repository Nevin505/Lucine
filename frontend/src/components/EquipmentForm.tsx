import { useState, type FormEvent } from "react";
import { Button, Field } from "@/ui";
import {
  createEquipment,
  createEquipmentSchema,
  updateEquipment,
  type Equipment,
  type EquipmentStatus,
} from "@/lib/equipment";

type Props = {
  equipment?: Equipment | null;
  onCancel: () => void;
  onSaved: (equipment: Equipment) => void;
};

export function EquipmentForm({ equipment, onCancel, onSaved }: Props) {
  const isEdit = Boolean(equipment);
  const [name, setName] = useState(equipment?.name ?? "");
  const [code, setCode] = useState(equipment?.code ?? "");
  const [status, setStatus] = useState<EquipmentStatus>(
    equipment?.status ?? "ACTIVE",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (isEdit && equipment) {
      const payload = { name, code, status };
      const parsed = createEquipmentSchema.safeParse(payload);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setFieldErrors(next);
        return;
      }

      setFieldErrors({});
      setPending(true);
      try {
        const saved = await updateEquipment(equipment.id, parsed.data);
        onSaved(saved);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setPending(false);
      }
      return;
    }

    const parsed = createEquipmentSchema.safeParse({ name, code });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const saved = await createEquipment(parsed.data);
      onSaved(saved);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-1">
        <p className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase">
          {isEdit ? "Edit equipment" : "New equipment"}
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#0c1a1f]">
          {isEdit ? equipment?.name : "Add a piece of equipment"}
        </h2>
      </div>

      <Field
        id="equipment-name"
        name="name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        autoComplete="off"
      />

      <Field
        id="equipment-code"
        name="code"
        label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={fieldErrors.code}
        autoComplete="off"
      />

      {isEdit ? (
        <div className="grid gap-1.5">
          <label
            htmlFor="equipment-status"
            className="text-sm font-semibold tracking-wide text-[#1a333c]"
          >
            Status
          </label>
          <select
            id="equipment-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
            className="w-full rounded-xl border border-[#0c1a1f]/12 bg-white px-4 py-3.5 text-[#0c1a1f] outline-none transition focus:border-[#1f7a6c] focus:ring-[3px] focus:ring-[#1f7a6c]/20"
          >
            <option value="ACTIVE">Active</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      ) : null}

      {formError ? (
        <p className="text-sm text-[#b42318]">{formError}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create equipment"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
