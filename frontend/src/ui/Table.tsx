import type { ReactNode } from "react";
import { Button } from "./Button";

export type TableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  /** When true, Table slices `rows` locally instead of expecting a server page. */
  clientSide?: boolean;
};

type Props<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  scrollable?: boolean;
  loading?: boolean;
  pagination?: TablePaginationProps;
};

function TableLoader() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-[#e8f2f0]/70 backdrop-blur-[1px]"
      aria-hidden="true"
    >
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1f7a6c]/25 border-t-[#1f7a6c]" />
    </div>
  );
}

function SkeletonRows({ columns, count }: { columns: number; count: number }) {
  return Array.from({ length: count }, (_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`} className="border-b border-[#0c1a1f]/8">
      {Array.from({ length: columns }, (__, cellIndex) => (
        <td key={cellIndex} className="px-3 py-2.5">
          <div className="h-4 animate-pulse rounded bg-[#0c1a1f]/10" />
        </td>
      ))}
    </tr>
  ));
}

function TablePaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total <= pageSize) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-sm text-[#0c1a1f]/55">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2.5 text-sm"
          disabled={page <= 1 || disabled}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2.5 text-sm"
          disabled={page >= totalPages || disabled}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No rows to show.",
  className = "",
  scrollable = false,
  loading = false,
  pagination,
}: Props<T>) {
  const pageSize = pagination?.pageSize ?? 10;
  const skeletonCount = pageSize;

  const displayRows =
    pagination?.clientSide && pagination
      ? rows.slice(
          (pagination.page - 1) * pagination.pageSize,
          pagination.page * pagination.pageSize,
        )
      : rows;

  const showEmpty = !loading && displayRows.length === 0;

  if (showEmpty) {
    return <p className="text-sm text-[#0c1a1f]/60">{emptyMessage}</p>;
  }

  const wrapperClass = scrollable
    ? "max-h-[min(60vh,420px)] overflow-auto border-y border-[#0c1a1f]/12"
    : "overflow-x-auto border-y border-[#0c1a1f]/12";

  const showSkeleton = loading && displayRows.length === 0;
  const showOverlay = loading && displayRows.length > 0;

  return (
    <div className={`grid gap-3 ${className}`}>
      <div className="relative" aria-busy={loading}>
        <div
          className={`${wrapperClass} ${showOverlay ? "pointer-events-none opacity-60" : ""}`}
        >
          <table className="w-full min-w-full border-collapse text-left text-sm">
            <thead className={scrollable ? "sticky top-0 bg-[#e8f2f0]" : ""}>
              <tr className="border-b border-[#0c1a1f]/12">
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className={`px-3 py-2.5 text-xs font-bold tracking-wide text-[#0c1a1f]/55 uppercase ${column.headerClassName ?? ""}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <SkeletonRows columns={columns.length} count={skeletonCount} />
              ) : (
                displayRows.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    className="border-b border-[#0c1a1f]/8 last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        className={`px-3 py-2.5 text-[#0c1a1f]/85 ${column.cellClassName ?? ""}`}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {loading ? <TableLoader /> : null}
      </div>

      {pagination ? <TablePaginationFooter {...pagination} /> : null}
    </div>
  );
}
