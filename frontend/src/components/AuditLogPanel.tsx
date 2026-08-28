import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Table, type TableColumn } from "@/ui";
import { useFetch } from "@/hooks/useFetch";
import {
  listAuditEntries,
  type AuditEntry,
  type CleaningRecord,
  type CleaningRecordStatus,
  type FieldChange,
} from "@/lib/cleaning-records";

const FETCH_PAGE_SIZE = 100;
const ROW_PAGE_SIZE = 6;

const TRACKED_FIELDS = ["cleanedAt", "method", "notes", "status"] as const;

const FIELD_LABELS: Record<(typeof TRACKED_FIELDS)[number], string> = {
  cleanedAt: "Cleaned at",
  method: "Method",
  notes: "Notes",
  status: "Status",
};

type Props = {
  equipmentId: string;
  recordId: string;
  recordMethod: string;
  onClose: () => void;
};

type AuditRow = {
  id: string;
  when: string;
  user: string;
  action: string;
  field: string;
  previous: string;
  next: string;
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function statusLabel(status: CleaningRecordStatus | unknown) {
  return status === "VERIFIED" ? "Verified" : "Pending";
}

function formatValue(field: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field === "cleanedAt") return formatTimestamp(String(value));
  if (field === "status") return statusLabel(value);
  return String(value);
}

function isFieldChange(value: unknown): value is FieldChange {
  return (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value
  );
}

function actionLabel(action: AuditEntry["action"]) {
  return action === "CREATE" ? "Created" : "Updated";
}

function flattenEntry(entry: AuditEntry): AuditRow[] {
  const base = {
    when: formatTimestamp(entry.createdAt),
    user: entry.userName,
    action: actionLabel(entry.action),
  };

  if (entry.action === "CREATE") {
    const snapshot = entry.changes as CleaningRecord;
    return TRACKED_FIELDS.map((field) => ({
      id: `${entry.id}-${field}`,
      ...base,
      field: FIELD_LABELS[field],
      previous: "—",
      next: formatValue(field, snapshot[field]),
    }));
  }

  const diff = entry.changes as Record<string, FieldChange>;
  return Object.entries(diff)
    .filter(([, change]) => isFieldChange(change))
    .map(([field, change]) => ({
      id: `${entry.id}-${field}`,
      ...base,
      field: FIELD_LABELS[field as (typeof TRACKED_FIELDS)[number]] ?? field,
      previous: formatValue(field, change.from),
      next: formatValue(field, change.to),
    }));
}

const auditColumns: TableColumn<AuditRow>[] = [
  {
    header: "When",
    cell: (row) => row.when,
    cellClassName: "whitespace-nowrap text-[#0c1a1f]/70",
  },
  { header: "User", cell: (row) => row.user },
  {
    header: "Action",
    cell: (row) => row.action,
    cellClassName: "font-semibold text-[#1f7a6c]",
  },
  { header: "Field", cell: (row) => row.field },
  {
    header: "Previous",
    cell: (row) => row.previous,
    cellClassName: "text-[#0c1a1f]/55",
  },
  { header: "New", cell: (row) => row.next },
];

export function AuditLogPanel({
  equipmentId,
  recordId,
  recordMethod,
  onClose,
}: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [recordId]);

  const fetcher = useCallback(
    () =>
      listAuditEntries(equipmentId, recordId, {
        page: 1,
        pageSize: FETCH_PAGE_SIZE,
      }),
    [equipmentId, recordId],
  );

  const { data, loading, error } = useFetch(fetcher);

  const items = data?.items ?? [];

  const allRows = useMemo(() => items.flatMap(flattenEntry), [items]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase">
          Audit log
        </p>
        <h2
          id="audit-log-title"
          className="font-serif text-2xl font-semibold tracking-tight text-[#0c1a1f]"
        >
          Change history
        </h2>
        <p className="text-sm text-[#0c1a1f]/55">{recordMethod}</p>
      </div>

      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}

      {loading ? (
        <p className="text-[#0c1a1f]/60">Loading history…</p>
      ) : (
        <Table
          columns={auditColumns}
          rows={allRows}
          getRowKey={(row) => row.id}
          emptyMessage="No audit entries yet."
          scrollable
          pagination={{
            page,
            pageSize: ROW_PAGE_SIZE,
            total: allRows.length,
            onPageChange: setPage,
            disabled: loading,
            clientSide: true,
          }}
        />
      )}

      <div className="mt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
