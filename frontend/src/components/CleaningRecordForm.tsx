import { useState, type FormEvent } from "react";
import { Button, Field } from "@/ui";
import {
  createCleaningRecord,
  createCleaningRecordSchema,
  updateCleaningRecord,
  type CleaningRecord,
  type CleaningRecordStatus,
} from "@/lib/cleaning-records";

type Props = {
  equipmentId: string;
  record?: CleaningRecord | null;
  onCancel: () => void;
  onSaved: (record: CleaningRecord) => void;
  allowCreate?: boolean;
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowLocalInputValue() {
  return toLocalInputValue(new Date().toISOString());
}

export function CleaningRecordForm({
  equipmentId,
  record,
  onCancel,
  onSaved,
  allowCreate = true,
}: Props) {
  const isEdit = Boolean(record);
  const [cleanedAt, setCleanedAt] = useState(
    record ? toLocalInputValue(record.cleanedAt) : nowLocalInputValue(),
  );
  const [method, setMethod] = useState(record?.method ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [status, setStatus] = useState<CleaningRecordStatus>(
    record?.status ?? "PENDING",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      cleanedAt: cleanedAt ? new Date(cleanedAt).toISOString() : "",
      method,
      notes: notes.trim() ? notes.trim() : undefined,
      status,
    };

    const parsed = createCleaningRecordSchema.safeParse(payload);
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
      if (isEdit && record) {
        const saved = await updateCleaningRecord(
          equipmentId,
          record.id,
          parsed.data,
        );
        onSaved(saved);
      } else {
        if (!allowCreate) {
          setFormError("Cannot create cleaning records for retired equipment");
          return;
        }
        const saved = await createCleaningRecord(equipmentId, parsed.data);
        onSaved(saved);
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Update failed"
            : "Create failed",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-1">
        <p className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase">
          {isEdit ? "Edit cleaning record" : "New cleaning record"}
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#0c1a1f]">
          {isEdit ? "Update cleaning details" : "Log a cleaning"}
        </h2>
      </div>

      <Field
        id="cleaned-at"
        name="cleanedAt"
        label="Cleaned at"
        type="datetime-local"
        value={cleanedAt}
        onChange={(e) => setCleanedAt(e.target.value)}
        error={fieldErrors.cleanedAt}
      />

      <Field
        id="method"
        name="method"
        label="Method"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        error={fieldErrors.method}
        autoComplete="off"
      />

      <div className="grid gap-1.5">
        <label
          htmlFor="notes"
          className="text-sm font-semibold tracking-wide text-[#1a333c]"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-[#0c1a1f]/12 bg-white px-4 py-3.5 text-[#0c1a1f] outline-none transition focus:border-[#1f7a6c] focus:ring-[3px] focus:ring-[#1f7a6c]/20"
        />
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="status"
          className="text-sm font-semibold tracking-wide text-[#1a333c]"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CleaningRecordStatus)}
          className="w-full rounded-xl border border-[#0c1a1f]/12 bg-white px-4 py-3.5 text-[#0c1a1f] outline-none transition focus:border-[#1f7a6c] focus:ring-[3px] focus:ring-[#1f7a6c]/20"
        >
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
        </select>
      </div>

      {isEdit && record ? (
        <p className="text-sm text-[#0c1a1f]/55">
          Cleaned by {record.cleanedByName}
        </p>
      ) : null}

      {formError ? (
        <p className="text-sm text-[#b42318]">{formError}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create record"}
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
