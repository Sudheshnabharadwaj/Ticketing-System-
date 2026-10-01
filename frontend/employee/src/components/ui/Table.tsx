import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  compact?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  isLoading = false,
  compact = false
}: TableProps<T>) {
  const cellPadding = compact ? 'px-3.5 py-2.5' : 'px-4 py-3';

  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[12px] tracking-wider uppercase">
            {columns.map((col, idx) => (
              <th key={idx} className={`${cellPadding} ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className={`${cellPadding} py-8 text-center text-slate-500`}>
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
                  Loading data...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={`${cellPadding} py-8 text-center text-slate-500 text-[13px]`}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-slate-50/80 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className={`${cellPadding} text-slate-800 ${col.className || ''}`}>
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? (row[col.accessorKey] as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
