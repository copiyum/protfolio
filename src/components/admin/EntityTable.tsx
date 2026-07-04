import Link from "next/link";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export interface EntityTableProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  editHref: (id: string) => string;
  newHref: string;
  caption?: string;
}

export function EntityTable<T extends { id: string }>({ rows, columns, editHref, newHref, caption = "Admin rows" }: EntityTableProps<T>) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={newHref}
          className="inline-block rounded bg-[color:var(--foreground)] px-3 py-1 text-sm text-[color:var(--background)]"
        >
          + New
        </Link>
      </div>
      <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-[color:var(--foreground)]/5 text-left">
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)} className="p-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4 text-center text-[color:var(--foreground)]/50">
                  No rows yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--foreground)]/5 hover:bg-[color:var(--foreground)]/[0.02]">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="p-2">
                      <Link href={editHref(r.id)} className="block">
                        {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key as string] ?? "")}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
