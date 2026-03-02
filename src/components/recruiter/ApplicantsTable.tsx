import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  UserCheck,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Inbox,
  Briefcase,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import MatchScoreRing from "@/components/recruiter/MatchScoreRing";
import { getRtwScore, getRtwBadgeLabel, getRtwBadgeClass } from "@/lib/rtwBadge";

export type JobRow = {
  id: string;
  title: string;
  location_name: string | null;
  sector: string | null;
};

export type CandidateRtwRow = {
  rtw_verified: boolean | null;
  ni_confirmed: boolean | null;
  dbs_status: string | null;
} | null;

export type ApplicationRow = {
  id: string;
  job_id: string;
  employer_id: string;
  candidate_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  candidate_postcode: string | null;
  commute_distance_miles: number | null;
  commute_risk_level: string | null;
  journey_time_mins: number | null;
  match_score: number | null;
  status: string;
  outcome: string | null;
  has_rtw: boolean | null;
  created_at: string;
  shortlisted_at: string | null;
  last_contacted_at?: string | null;
  jobs: JobRow | null;
  candidates?: CandidateRtwRow;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Truth Engine: low/medium/high commute risk — exact token consistency. */
function CommuteRiskPill({ level }: { level: string | null }) {
  const normalized = (level ?? "").toLowerCase();
  if (normalized === "low" || normalized === "green") {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Low Risk
      </span>
    );
  }
  if (normalized === "medium" || normalized === "amber") {
    return (
      <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
        Caution
      </span>
    );
  }
  if (normalized === "high" || normalized === "red") {
    return (
      <span className="inline-flex rounded-full border border-rose-500/25 bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400">
        High Risk
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-[#1f2d47] bg-[#1a2438] px-2 py-0.5 text-xs font-medium text-[#8494b4]">
      Unscored
    </span>
  );
}

/** Truth Engine: RTW status — score 0–4 when candidate data present, else has_rtw only. */
function RTWBadge({
  hasRtw,
  candidates,
}: {
  hasRtw: boolean | null;
  candidates: CandidateRtwRow;
}) {
  const score = candidates
    ? getRtwScore({
        has_rtw: hasRtw,
        rtw_verified: candidates.rtw_verified,
        ni_confirmed: candidates.ni_confirmed,
        dbs_status: candidates.dbs_status,
      })
    : null;
  if (score !== null) {
    const label = getRtwBadgeLabel(score);
    const cls = getRtwBadgeClass(score);
    return (
      <Badge variant="secondary" className={cn("rounded-[6px] border", cls)}>
        {label}
      </Badge>
    );
  }
  if (hasRtw === true) {
    return (
      <Badge variant="default" className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 rounded-[6px]">
        RTW ✓
      </Badge>
    );
  }
  if (hasRtw === false) {
    return (
      <Badge variant="destructive" className="border border-rose-500/25 bg-rose-500/10 text-rose-400 rounded-[6px]">
        No RTW
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="border border-[#1f2d47] bg-[#1a2438] text-[#8494b4] rounded-[6px]">
      RTW?
    </Badge>
  );
}

/** Application status — Rejected uses Truth Engine rose token. */
function StatusBadge({ status }: { status: string }) {
  if (status === "shortlisted") {
    return (
      <Badge variant="default" className="border border-[#3b6ef5]/25 bg-[#3b6ef5]/10 text-[#3b6ef5] rounded-[6px]">
        Shortlisted
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="border border-rose-500/25 bg-rose-500/10 text-rose-400 rounded-[6px]">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="border border-[#1f2d47] bg-[#1a2438] text-[#8494b4] rounded-[6px]">
      Pending
    </Badge>
  );
}

const HRS_72_MS = 72 * 60 * 60 * 1000;

function isNoResponse72hrs(row: ApplicationRow): boolean {
  if (row.status === "rejected") return false;
  const ref = row.last_contacted_at ?? row.created_at;
  const refTime = new Date(ref).getTime();
  return Date.now() - refTime > HRS_72_MS;
}

type ApplicantsTableProps = {
  applications: ApplicationRow[];
  onSelectApplication: (applicationId: string) => void;
  onShortlist: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  /** When set, show checkboxes and call onSelectionChange when selection changes. */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
};

export function ApplicantsTable({
  applications,
  onSelectApplication,
  onShortlist,
  onReject,
  selectedIds,
  onSelectionChange,
}: ApplicantsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "match_score", desc: true },
  ]);

  const toggleSelection = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedIds ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds]
  );

  const columns = useMemo<ColumnDef<ApplicationRow>[]>(
    () => [
      ...(onSelectionChange
        ? [
            {
              id: "select",
              header: "Select",
              cell: ({ row }: { row: { original: ApplicationRow } }) => (
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#1f2d47] bg-[#141d2e] text-[#3b6ef5] focus:ring-[#3b6ef5]"
                  checked={selectedIds?.has(row.original.id) ?? false}
                  onChange={() => toggleSelection(row.original.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ),
              enableSorting: false,
            } as ColumnDef<ApplicationRow>,
          ]
        : []),
      {
        accessorKey: "full_name",
        id: "name",
        header: "Name",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="font-bold text-white text-sm">
              {row.original.full_name || "Unknown"}
            </p>
            <p className="text-[#8494b4] text-sm mt-0.5">
              {row.original.jobs?.title ?? "—"}
            </p>
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const a = (rowA.original.full_name ?? "").toLowerCase();
          const b = (rowB.original.full_name ?? "").toLowerCase();
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: "match_score",
        id: "match_score",
        header: "Match",
        enableSorting: true,
        cell: ({ row }) => {
          const score = row.original.match_score;
          return (
            <div className="flex items-center gap-1.5">
              <MatchScoreRing score={score} size="sm" />
              <span className="text-sm font-mono tabular-nums text-white">
                {score != null ? `${score}%` : "—"}
              </span>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.match_score ?? -1;
          const b = rowB.original.match_score ?? -1;
          return a - b;
        },
      },
      {
        accessorKey: "commute_risk_level",
        id: "commute",
        header: "Commute",
        enableSorting: false,
        cell: ({ row }) => (
          <CommuteRiskPill level={row.original.commute_risk_level} />
        ),
      },
      {
        accessorKey: "has_rtw",
        id: "rtw",
        header: "RTW",
        enableSorting: false,
        cell: ({ row }) => (
          <RTWBadge hasRtw={row.original.has_rtw} candidates={row.original.candidates ?? null} />
        ),
      },
      {
        accessorKey: "last_contacted_at",
        id: "last_contacted",
        header: "Last contacted",
        enableSorting: true,
        cell: ({ row }) => {
          const at = row.original.last_contacted_at;
          return (
<span className="text-sm font-mono tabular-nums text-[#8494b4]">
            {at ? formatDate(at) : "—"}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.last_contacted_at
            ? new Date(rowA.original.last_contacted_at).getTime()
            : 0;
          const b = rowB.original.last_contacted_at
            ? new Date(rowB.original.last_contacted_at).getTime()
            : 0;
          return a - b;
        },
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "created_at",
        id: "applied",
        header: "Applied",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-sm font-mono tabular-nums text-[#8494b4]">
            {formatDate(row.original.created_at)}
          </span>
        ),
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.created_at).getTime() -
          new Date(rowB.original.created_at).getTime(),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const app = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              {app.phone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`tel:${app.phone.replace(/\s/g, "")}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-white"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Call</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onShortlist(app.id)}
                    disabled={app.status === "shortlisted"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-white disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Shortlist</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onReject(app.id)}
                    disabled={app.status === "rejected"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-rose-400 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Reject</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectApplication(app.id)}
className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View profile</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [onSelectApplication, onShortlist, onReject, onSelectionChange, selectedIds, toggleSelection]
  );

  const table = useReactTable({
    data: applications,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const getSortIcon = (columnId: string) => {
    const sort = sorting.find((s) => s.id === columnId);
    if (!sort) return null;
    return sort.desc ? (
      <ChevronDown className="ml-1 h-4 w-4 inline" />
    ) : (
      <ChevronUp className="ml-1 h-4 w-4 inline" />
    );
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-12 flex flex-col items-center justify-center text-center">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#141d2e] border border-[#1f2d47] mb-4">
          <Inbox className="h-6 w-6 text-[#8494b4]" />
        </div>
        <h2 className="text-[20px] font-semibold text-white">No applicants yet</h2>
        <p className="mt-2 text-sm text-[#8494b4]">
          Post a job to start receiving applications
        </p>
        <Link
          to="/recruiter/post-job"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#3b6ef5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d7ef6] active:scale-[0.98] [color:white] [background-color:#3b6ef5]"
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>Post a Job</span>
        </Link>
      </div>
    );
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[14px] border border-[#1f2d47]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-[#1f2d47] bg-[#090d16] sticky top-0 text-xs uppercase tracking-wider text-[#4d5f7a] hover:bg-[#090d16]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "border-[#1f2d47] text-[#4d5f7a]",
                      header.column.getCanSort() &&
                        "cursor-pointer select-none"
                    )}
                    onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {getSortIcon(header.column.id)}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const noResponse72 = isNoResponse72hrs(row.original);
              return (
              <TableRow
                key={row.id}
                className={cn(
                  "transition-colors cursor-pointer border-b border-[#1f2d47]",
                  noResponse72
                    ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500/50"
                    : "bg-[#0f1522] hover:bg-[#141d2e]"
                )}
                onClick={() => onSelectApplication(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="border-[#1f2d47] text-white"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#8494b4] tabular-nums">
          Showing {start}–{end} of {total} applicants
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-[#1f2d47] bg-[#0f1522] text-white hover:bg-[#141d2e]"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-[#1f2d47] bg-[#0f1522] text-white hover:bg-[#141d2e]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
