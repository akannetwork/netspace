'use client';

import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef
} from '@tanstack/react-table';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: keyof T;
    loading?: boolean;
    actions?: (item: T) => React.ReactNode;
    emptyMessage?: string;
    pagination?: {
        current: number;
        total: number;
        limit: number;
        onPageChange: (page: number) => void;
    };
    className?: string;
}

export function DataTable<T extends { [key: string]: any }>({
    columns,
    data,
    keyField,
    loading = false,
    actions,
    emptyMessage = 'No records found.',
    pagination,
    className
}: DataTableProps<T>) {

    // Convert Legacy Columns + Actions to TanStack Columns
    const tableColumns = useMemo(() => {
        const cols: ColumnDef<T, any>[] = columns.map((col, idx) => ({
            id: col.accessorKey ? String(col.accessorKey) : `col_${idx}`,
            accessorKey: col.accessorKey as string,
            header: col.header,
            cell: (info) => {
                if (col.render) return col.render(info.row.original);
                return info.getValue();
            },
            meta: {
                className: col.className
            }
        }));

        if (actions) {
            cols.push({
                id: 'actions',
                header: 'İşlemler',
                cell: (info) => actions(info.row.original),
                meta: {
                    isSticky: true
                }
            });
        }

        return cols;
    }, [columns, actions]);

    // Initialize Table
    const table = useReactTable({
        data: data || [],
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    // Loading & Empty States
    if (loading && (!data || data.length === 0)) {
        return <div className="p-8 text-center text-gray-500">Loading data...</div>;
    }

    if (!loading && (!data || data.length === 0)) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed">{emptyMessage}</div>;
    }

    const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

    return (
        <div
            className={`${className || ''}`}
            style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Table Container */}
            <div
                className="bg-white rounded shadow border border-gray-100 relative"
                style={{ width: '100%', overflow: 'hidden' }}
            >
                {loading && (
                    <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Scrollable Wrapper - This is the key! */}
                <div
                    style={{
                        overflowX: 'auto',
                        overflowY: 'visible',
                        width: '100%',
                        maxWidth: '100%'
                    }}
                >
                    <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                        <thead className="bg-gray-50 border-b">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        const meta = header.column.columnDef.meta as any;
                                        const isSticky = meta?.isSticky;

                                        return (
                                            <th
                                                key={header.id}
                                                className={`p-3 sm:p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${meta?.className || ''}`}
                                                style={isSticky ? {
                                                    position: 'sticky',
                                                    right: 0,
                                                    backgroundColor: '#f9fafb',
                                                    textAlign: 'right',
                                                    boxShadow: '0px 0px 8px rgba(0,0,0,1)',
                                                    zIndex: 10
                                                } : {}}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {table.getRowModel().rows.map(row => (
                                <tr key={String(row.original[keyField])} className="hover:bg-gray-50 transition-colors group">
                                    {row.getVisibleCells().map(cell => {
                                        const meta = cell.column.columnDef.meta as any;
                                        const isSticky = meta?.isSticky;

                                        return (
                                            <td
                                                key={cell.id}
                                                className={`p-3 sm:p-4 text-sm text-gray-700 whitespace-nowrap ${isSticky ? 'group-hover:bg-gray-50' : ''}`}
                                                style={isSticky ? {
                                                    position: 'sticky',
                                                    right: 0,
                                                    backgroundColor: 'white',
                                                    textAlign: 'right',
                                                    boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.1)',
                                                    zIndex: 5
                                                } : {}}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && totalPages > 1 && (
                    <PaginationControls pagination={pagination} totalPages={totalPages} />
                )}
            </div>
        </div>
    );
}

function PaginationControls({ pagination, totalPages }: { pagination: any, totalPages: number }) {
    return (
        <div className="p-4 flex items-center justify-between border-t">
            <span className="text-sm text-gray-500 hidden sm:inline">
                {((pagination.current - 1) * pagination.limit) + 1} - {Math.min(pagination.current * pagination.limit, pagination.total)} / {pagination.total} kayıt
            </span>
            <span className="text-sm text-gray-500 sm:hidden">
                {pagination.current} / {totalPages}
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => pagination.onPageChange(pagination.current - 1)}
                    disabled={pagination.current <= 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Önceki
                </button>
                <div className="hidden sm:flex items-center px-2 text-sm font-medium">
                    Sayfa {pagination.current} / {totalPages}
                </div>
                <button
                    onClick={() => pagination.onPageChange(pagination.current + 1)}
                    disabled={pagination.current >= totalPages}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Sonraki
                </button>
            </div>
        </div>
    );
}
