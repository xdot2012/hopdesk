import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useUrlPagination from '~/hooks/useUrlPagination';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { cn } from '~/lib/utils';
import SortIcon from './SortIcon';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
  emptyMessage?: string;
  pageSize?: number;
  /** Conteúdo ao lado da barra de busca (ex.: filtro). */
  toolbarFilters?: ReactNode;
  /** Conteúdo alinhado à direita da barra de busca (ex.: botão criar). */
  toolbarEnd?: ReactNode;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  /** Server-side pagination */
  manualPagination?: boolean;
  pageIndex?: number;
  pageCount?: number;
  onPageChange?: (pageIndex: number) => void;
  /** Persist client-side page in the URL (?page=2). */
  syncPageToUrl?: boolean;
  pageParam?: string;
  /** When this value changes, resets to the first page (e.g. external filters). */
  paginationResetKey?: string | number;
};

type PageItem = number | 'ellipsis';

/** 1-based page numbers with ellipsis gaps for compact controls. */
function getVisiblePages(pageIndex: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const current = pageIndex + 1;
  const pages = new Set<number>([1, pageCount]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= pageCount) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(sorted[index]);
  }
  return items;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  searchColumn,
  emptyMessage,
  pageSize = 15,
  toolbarFilters,
  toolbarEnd,
  onRowClick,
  getRowClassName,
  manualPagination = false,
  pageIndex: controlledPageIndex,
  pageCount: controlledPageCount,
  onPageChange,
  syncPageToUrl = false,
  pageParam = 'page',
  paginationResetKey,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { pageIndex: urlPageIndex, setPageIndex, resetPage } = useUrlPagination({ param: pageParam });
  const usesUrlPagination = syncPageToUrl && !manualPagination;
  const prevPaginationResetKey = useRef(paginationResetKey);
  const tableShellRef = useRef<HTMLDivElement>(null);
  const [tableMinHeight, setTableMinHeight] = useState<number | undefined>();

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      ...(manualPagination
        ? { pagination: { pageIndex: controlledPageIndex ?? 0, pageSize } }
        : usesUrlPagination
          ? { pagination: { pageIndex: urlPageIndex, pageSize } }
          : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualPagination ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination ? controlledPageCount : undefined,
    initialState: {
      pagination: { pageSize },
    },
  });

  const filterColumn = searchColumn ? table.getColumn(searchColumn) : undefined;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const clientPageCount = Math.max(Math.ceil(filteredRowCount / pageSize), 1);
  const visibleRows = table.getRowModel().rows;

  useEffect(() => {
    if (!usesUrlPagination || filteredRowCount === 0) return;
    const maxPageIndex = Math.max(clientPageCount - 1, 0);
    if (urlPageIndex > maxPageIndex) {
      setPageIndex(maxPageIndex);
    }
  }, [usesUrlPagination, clientPageCount, urlPageIndex, filteredRowCount, setPageIndex]);

  useEffect(() => {
    if (!usesUrlPagination || paginationResetKey === undefined) return;
    if (prevPaginationResetKey.current === paginationResetKey) return;
    prevPaginationResetKey.current = paginationResetKey;
    resetPage();
  }, [usesUrlPagination, paginationResetKey, resetPage]);

  const pageIndex = manualPagination
    ? (controlledPageIndex ?? 0)
    : usesUrlPagination
      ? urlPageIndex
      : table.getState().pagination.pageIndex;
  const pageCount = manualPagination
    ? Math.max(controlledPageCount ?? 0, 1)
    : usesUrlPagination
      ? clientPageCount
      : table.getPageCount();
  const showPagination = manualPagination
    ? (controlledPageCount ?? 0) > 1
    : usesUrlPagination
      ? filteredRowCount > pageSize
      : table.getFilteredRowModel().rows.length > pageSize;

  useLayoutEffect(() => {
    const el = tableShellRef.current;
    if (!el) return;
    if (visibleRows.length === 0) {
      setTableMinHeight(undefined);
      return;
    }
    if (visibleRows.length >= pageSize) {
      setTableMinHeight(el.offsetHeight);
      return;
    }
    // Página parcial: na primeira página usa a altura natural (ex.: após filtros);
    // nas demais preserva a altura já medida para evitar salto ao ir à última página.
    if (pageIndex === 0) {
      setTableMinHeight(el.offsetHeight);
      return;
    }
    setTableMinHeight((prev) => prev ?? el.offsetHeight);
  }, [visibleRows.length, pageSize, pageIndex, data, columns]);

  const goToPage = (nextPageIndex: number) => {
    const clamped = Math.min(Math.max(nextPageIndex, 0), Math.max(pageCount - 1, 0));
    if (manualPagination) {
      onPageChange?.(clamped);
      return;
    }
    if (usesUrlPagination) {
      setPageIndex(clamped);
      return;
    }
    table.setPageIndex(clamped);
  };

  const goPrevious = () => goToPage(pageIndex - 1);
  const goNext = () => goToPage(pageIndex + 1);

  const canPrevious = manualPagination || usesUrlPagination ? pageIndex > 0 : table.getCanPreviousPage();
  const canNext = manualPagination || usesUrlPagination
    ? pageIndex + 1 < pageCount
    : table.getCanNextPage();
  const visiblePages = showPagination ? getVisiblePages(pageIndex, pageCount) : [];

  const showToolbar = Boolean(filterColumn || toolbarFilters || toolbarEnd);

  return (
    <div className="space-y-3">
      {showToolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {filterColumn ? (
              <Input
                value={(filterColumn.getFilterValue() as string) ?? ''}
                onChange={(event) => filterColumn.setFilterValue(event.target.value)}
                placeholder={searchPlaceholder ?? t('dataTable.search')}
                className="h-9 max-w-sm"
                aria-label={searchPlaceholder ?? t('dataTable.search')}
              />
            ) : null}
            {toolbarFilters ? <div className="shrink-0">{toolbarFilters}</div> : null}
          </div>
          {toolbarEnd ? <div className="shrink-0 sm:ml-auto">{toolbarEnd}</div> : null}
        </div>
      ) : null}

      <div
        ref={tableShellRef}
        className="rounded-md border bg-card"
        style={tableMinHeight ? { minHeight: tableMinHeight } : undefined}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = !manualPagination && header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 px-3 hover:bg-transparent"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={sorted} />
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    getRowClassName?.(row),
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage ?? t('dataTable.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('dataTable.pageOf', { page: pageIndex + 1, pages: Math.max(pageCount, 1) })}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goPrevious}
              disabled={!canPrevious}
              aria-label={t('dataTable.previous')}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dataTable.previous')}</span>
            </Button>
            {visiblePages.map((item, index) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 min-w-9 items-center justify-center px-1 text-sm text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === pageIndex + 1 ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 min-w-9 px-2 tabular-nums"
                  onClick={() => goToPage(item - 1)}
                  aria-label={t('dataTable.goToPage', { page: item })}
                  aria-current={item === pageIndex + 1 ? 'page' : undefined}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={!canNext}
              aria-label={t('dataTable.next')}
            >
              <span className="hidden sm:inline">{t('dataTable.next')}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { ColumnDef };
