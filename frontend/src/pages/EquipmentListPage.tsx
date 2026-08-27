import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Modal } from "@/ui";
import { PageShell } from "@/components/PageShell";
import { EquipmentForm } from "@/components/EquipmentForm";
import { useFetch } from "@/hooks/useFetch";
import {
  deleteEquipment,
  listEquipment,
  type Equipment,
  type EquipmentListResponse,
  type EquipmentStatus,
} from "@/lib/equipment";

const PAGE_SIZE = 10;

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; equipment: Equipment }
  | null;

function statusLabel(status: EquipmentStatus) {
  return status === "ACTIVE" ? "Active" : "Retired";
}

function parseStatusFilter(value: string | null): EquipmentStatus | "ALL" {
  if (value === "ACTIVE" || value === "RETIRED") return value;
  return "ALL";
}

export function EquipmentListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const fetcher = useCallback(
    () =>
      listEquipment({
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        page,
        pageSize: PAGE_SIZE,
      }),
    [page, statusFilter],
  );

  const { data, loading, error, refetch } =
    useFetch<EquipmentListResponse>(fetcher);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function setFilter(next: EquipmentStatus | "ALL") {
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

  async function handleDelete(equipment: Equipment) {
    setActionError(null);
    setDeletingId(equipment.id);
    try {
      await deleteEquipment(equipment.id);
      const nextTotal = total - 1;
      const nextPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      if (page > nextPages) {
        setPage(nextPages);
      } else {
        await refetch();
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete equipment",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageShell
      wide
      title="Manage equipment."
      description="Create, update, and retire equipment used in cleaning records."
    >
      <section className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase">
              Equipment
            </p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#0c1a1f]">
              Inventory
            </h2>
          </div>
          <Button type="button" onClick={() => setModal({ mode: "create" })}>
            Add equipment
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All"],
              ["ACTIVE", "Active"],
              ["RETIRED", "Retired"],
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

        {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
        {actionError ? (
          <p className="text-sm text-[#b42318]">{actionError}</p>
        ) : null}

        {loading ? (
          <p className="text-[#0c1a1f]/60">Loading equipment…</p>
        ) : items.length === 0 ? (
          <p className="text-[#0c1a1f]/60">
            No equipment found. Add one to get started.
          </p>
        ) : (
          <ul className="grid gap-0 divide-y divide-[#0c1a1f]/12 border-y border-[#0c1a1f]/12">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="grid min-w-0 gap-1">
                  <Link
                    to={`/equipment/${item.id}`}
                    className="truncate font-semibold text-[#0c1a1f] underline-offset-2 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-[#0c1a1f]/55">
                    <code className="rounded-md bg-[#1f7a6c]/10 px-1.5 py-0.5 text-[0.78rem]">
                      {item.code}
                    </code>
                    <span className="mx-2 text-[#0c1a1f]/25">·</span>
                    {statusLabel(item.status)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-4 py-2.5 text-sm"
                    onClick={() => navigate(`/equipment/${item.id}`)}
                  >
                    Records
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-4 py-2.5 text-sm"
                    onClick={() => {
                      setActionError(null);
                      setModal({ mode: "edit", equipment: item });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-4 py-2.5 text-sm"
                    disabled={deletingId === item.id}
                    onClick={() => void handleDelete(item)}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
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
                disabled={page <= 1 || loading}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-4 py-2.5 text-sm"
                disabled={page >= totalPages || loading}
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
          <EquipmentForm
            key={
              modal.mode === "edit" ? modal.equipment.id : "create-equipment"
            }
            equipment={modal.mode === "edit" ? modal.equipment : null}
            onCancel={closeModal}
            onSaved={() => {
              closeModal();
              setActionError(null);
              void refetch();
            }}
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
