import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Modal, Table, type TableColumn } from "@/ui";
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

function equipmentColumns(
  navigate: ReturnType<typeof useNavigate>,
  deletingId: string | null,
  onEdit: (equipment: Equipment) => void,
  onDelete: (equipment: Equipment) => void,
): TableColumn<Equipment>[] {
  return [
    {
      header: "Name",
      cell: (item) => (
        <Link
          to={`/equipment/${item.id}`}
          className="font-semibold text-[#0c1a1f] underline-offset-2 hover:underline"
        >
          {item.name}
        </Link>
      ),
    },
    {
      header: "ID",
      cell: (item) => (
        <code className="rounded-md bg-[#1f7a6c]/10 px-1.5 py-0.5 text-[0.78rem]">
          {item.code}
        </code>
      ),
    },
    {
      header: "Status",
      cell: (item) => statusLabel(item.status),
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
            onClick={() => navigate(`/equipment/${item.id}`)}
          >
            Cleaning records
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            onClick={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            disabled={deletingId === item.id}
            onClick={() => void onDelete(item)}
          >
            {deletingId === item.id ? "Deleting…" : "Delete"}
          </Button>
        </div>
      ),
    },
  ];
}

export function EquipmentListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const nameFilter = searchParams.get("name")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [nameInput, setNameInput] = useState(nameFilter);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    setNameInput(nameFilter);
  }, [nameFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = nameInput.trim();
      if (trimmed === nameFilter) return;

      const params = new URLSearchParams(searchParams);
      if (trimmed) params.set("name", trimmed);
      else params.delete("name");
      params.delete("page");
      setSearchParams(params);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [nameFilter, nameInput, searchParams, setSearchParams]);

  const closeModal = useCallback(() => setModal(null), []);

  const fetcher = useCallback(
    () =>
      listEquipment({
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        ...(nameFilter ? { name: nameFilter } : {}),
        page,
        pageSize: PAGE_SIZE,
      }),
    [nameFilter, page, statusFilter],
  );

  const { data, loading, error, refetch } =
    useFetch<EquipmentListResponse>(fetcher);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function setFilter(next: EquipmentStatus | "ALL") {
    setActionError(null);
    const params = new URLSearchParams(searchParams);
    if (next !== "ALL") params.set("status", next);
    else params.delete("status");
    params.delete("page");
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

  const columns = equipmentColumns(
    navigate,
    deletingId,
    (equipment) => {
      setActionError(null);
      setModal({ mode: "edit", equipment });
    },
    handleDelete,
  );

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

        <div className="flex flex-wrap items-center gap-3">
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

          <div className="min-w-[min(100%,16rem)] flex-1 sm:max-w-xs">
            <Input
              type="search"
              value={nameInput}
              placeholder="Search by name"
              aria-label="Search equipment by name"
              onChange={(event) => setNameInput(event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
        {actionError ? (
          <p className="text-sm text-[#b42318]">{actionError}</p>
        ) : null}

        <Table
          columns={columns}
          rows={items}
          getRowKey={(item) => item.id}
          loading={loading}
          emptyMessage={
            nameFilter
              ? "No equipment matches that name."
              : "No equipment found. Add one to get started."
          }
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
            disabled: loading,
          }}
        />
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
