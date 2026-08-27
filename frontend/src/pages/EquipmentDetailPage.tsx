import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Modal } from "@/ui";
import { PageShell } from "@/components/PageShell";
import { CleaningRecordForm } from "@/components/CleaningRecordForm";
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = equipment?.status === "ACTIVE";

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
      description="Create, update, and review cleaning records for this equipment."
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
          <p className="text-sm text-[#0c1a1f]/55">
            This equipment is retired. Existing records can be edited, but new
            ones cannot be created.
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

        {recordsLoading ? (
          <p className="text-[#0c1a1f]/60">Loading records…</p>
        ) : items.length === 0 ? (
          <p className="text-[#0c1a1f]/60">
            No cleaning records yet.
            {canCreate ? " Add one to get started." : ""}
          </p>
        ) : (
          <ul className="grid gap-0 divide-y divide-[#0c1a1f]/12 border-y border-[#0c1a1f]/12">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="grid min-w-0 gap-1">
                  <p className="truncate font-semibold text-[#0c1a1f]">
                    {item.method}
                  </p>
                  <p className="text-sm text-[#0c1a1f]/55">
                    {formatCleanedAt(item.cleanedAt)}
                    <span className="mx-2 text-[#0c1a1f]/25">·</span>
                    {item.cleanedByName}
                    <span className="mx-2 text-[#0c1a1f]/25">·</span>
                    {statusLabel(item.status)}
                  </p>
                  {item.notes ? (
                    <p className="text-sm text-[#0c1a1f]/45">{item.notes}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 py-2.5 text-sm"
                  onClick={() => {
                    setActionError(null);
                    setModal({ mode: "edit", record: item });
                  }}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}

        {total > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#0c1a1f]/55">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="px-4 py-2.5 text-sm"
                disabled={page <= 1 || recordsLoading}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-4 py-2.5 text-sm"
                disabled={page >= totalPages || recordsLoading}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal open={modal !== null} onClose={closeModal}>
        {modal ? (
          <CleaningRecordForm
            key={
              modal.mode === "edit" ? modal.record.id : "create-cleaning-record"
            }
            equipmentId={id}
            record={modal.mode === "edit" ? modal.record : null}
            allowCreate={canCreate}
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
