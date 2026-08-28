import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Modal, Table, type TableColumn } from "@/ui";
import { PageShell } from "@/components/PageShell";
import { CleaningRecordForm } from "@/components/CleaningRecordForm";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { useFetch } from "@/hooks/useFetch";
import { getEquipment, type EquipmentDetail } from "@/lib/equipment";
import {
  listCleaningRecords,
  type CleaningRecord,
  type CleaningRecordListResponse,
  type CleaningRecordStatus,
} from "@/lib/cleaning-records";

const PAGE_SIZE = 10;

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; record: CleaningRecord }
  | { mode: "history"; record: CleaningRecord }
  | null;

function statusLabel(status: CleaningRecordStatus) {
  return status === "PENDING" ? "Pending" : "Verified";
}

function parseStatusFilter(
  value: string | null,
): CleaningRecordStatus | "ALL" {
  if (value === "PENDING" || value === "VERIFIED") return value;
  return "ALL";
}

function formatCleanedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function cleaningRecordColumns(
  canEdit: boolean,
  onHistory: (record: CleaningRecord) => void,
  onEdit: (record: CleaningRecord) => void,
): TableColumn<CleaningRecord>[] {
  return [
    {
      header: "Procedure",
      cell: (item) => (
        <span className="font-semibold text-[#0c1a1f]">{item.method}</span>
      ),
    },
    {
      header: "Date & time",
      cell: (item) => formatCleanedAt(item.cleanedAt),
    },
    {
      header: "Operator",
      cell: (item) => item.cleanedByName,
    },
    {
      header: "Status",
      cell: (item) => statusLabel(item.status),
    },
    {
      header: "Notes",
      cell: (item) =>
        item.notes ? (
          <span className="text-[#0c1a1f]/55">{item.notes}</span>
        ) : (
          <span className="text-[#0c1a1f]/30">—</span>
        ),
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            onClick={() => onHistory(item)}
          >
            History
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            disabled={!canEdit}
            onClick={() => onEdit(item)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];
}

export function EquipmentDetailPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const equipmentFetcher = useCallback(() => getEquipment(id), [id]);
  const {
    data: equipment,
    loading: equipmentLoading,
    error: equipmentError,
    refetch: refetchEquipment,
  } = useFetch<EquipmentDetail>(equipmentFetcher);

  const recordsFetcher = useCallback(
    () =>
      listCleaningRecords(id, {
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        page,
        pageSize: PAGE_SIZE,
      }),
    [id, page, statusFilter],
  );

  const {
    data: recordsData,
    loading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useFetch<CleaningRecordListResponse>(recordsFetcher);

  const items = recordsData?.items ?? [];
  const total = recordsData?.total ?? 0;
  const canCreate = equipment?.status === "ACTIVE";
  const canEdit = canCreate;

  const columns = cleaningRecordColumns(
    canEdit,
    (record) => {
      setActionError(null);
      setModal({ mode: "history", record });
    },
    (record) => {
      setActionError(null);
      setModal({ mode: "edit", record });
    },
  );

  function setFilter(next: CleaningRecordStatus | "ALL") {
    setActionError(null);
    const params = new URLSearchParams();
    if (next !== "ALL") params.set("status", next);
    setSearchParams(params);
  }

  function setPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    setSearchParams(params);
  }

  if (equipmentLoading && !equipment) {
    return (
      <PageShell
        wide
        title="Cleaning records."
        description="Loading equipment…"
      >
        <p className="text-[#0c1a1f]/60">Loading…</p>
      </PageShell>
    );
  }

  if (equipmentError || !equipment) {
    return (
      <PageShell
        wide
        title="Cleaning records."
        description="Could not load this equipment."
      >
        <div className="grid gap-4">
          <p className="text-sm text-[#b42318]">
            {equipmentError ?? "Equipment not found"}
          </p>
          <Link
            to="/equipment"
            className="text-sm font-semibold text-[#1f7a6c] underline-offset-2 hover:underline"
          >
            Back to equipment
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      wide
      title={equipment.name}
      description="Create, update, and review cleaning records. Use History on each record to view its audit log."
    >
      <section className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <Link
              to="/equipment"
              className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase underline-offset-2 hover:underline"
            >
              ← Equipment
            </Link>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#0c1a1f]">
              Cleaning records
            </h2>
            <p className="text-sm text-[#0c1a1f]/55">
              <code className="rounded-md bg-[#1f7a6c]/10 px-1.5 py-0.5 text-[0.78rem]">
                {equipment.code}
              </code>
              <span className="mx-2 text-[#0c1a1f]/25">·</span>
              {equipment.status === "ACTIVE" ? "Active" : "Retired"}
              <span className="mx-2 text-[#0c1a1f]/25">·</span>
              {equipment.cleaningRecordCount} total
            </p>
          </div>
          <Button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              setActionError(null);
              setModal({ mode: "create" });
            }}
          >
            Add record
          </Button>
        </div>

        {!canCreate ? (
          <p className="text-sm text-[#b42318]">
            This equipment is retired. Records cannot be created or edited.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All"],
              ["PENDING", "Pending"],
              ["VERIFIED", "Verified"],
            ] as const
          ).map(([value, label]) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#1f7a6c] text-white"
                    : "border border-[#0c1a1f]/12 text-[#1a333c] hover:bg-[#0c1a1f]/5"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {recordsError ? (
          <p className="text-sm text-[#b42318]">{recordsError}</p>
        ) : null}
        {actionError ? (
          <p className="text-sm text-[#b42318]">{actionError}</p>
        ) : null}

        <Table
          columns={columns}
          rows={items}
          getRowKey={(item) => item.id}
          loading={recordsLoading}
          emptyMessage={
            canCreate
              ? "No cleaning records yet. Add one to get started — each record keeps an audit log of changes."
              : "No cleaning records yet."
          }
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
            disabled: recordsLoading,
          }}
        />
      </section>

      <Modal
        open={modal !== null}
        onClose={closeModal}
        wide={modal?.mode === "history"}
        labelledBy={modal?.mode === "history" ? "audit-log-title" : undefined}
      >
        {modal?.mode === "history" ? (
          <AuditLogPanel
            key={modal.record.id}
            equipmentId={id}
            recordId={modal.record.id}
            recordMethod={modal.record.method}
            onClose={closeModal}
          />
        ) : modal ? (
          <CleaningRecordForm
            key={
              modal.mode === "edit" ? modal.record.id : "create-cleaning-record"
            }
            equipmentId={id}
            record={modal.mode === "edit" ? modal.record : null}
            allowCreate={canCreate}
            allowEdit={canEdit}
            onViewHistory={
              modal.mode === "edit"
                ? () =>
                    setModal({ mode: "history", record: modal.record })
                : undefined
            }
            onCancel={closeModal}
            onSaved={() => {
              closeModal();
              setActionError(null);
              void refetchRecords();
              void refetchEquipment();
            }}
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
