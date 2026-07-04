import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { adminAction, type AdminActionResult } from "@/lib/admin/actions/result";
import { deleteVisitorNote } from "@/lib/admin/actions/visitor-notes";
import { listVisitorNotes } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 102.4) / 10} KB`;
}

export default async function VisitorNotesAdminPage() {
  const notes = await listVisitorNotes().catch(() => []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Visitor Notes</h1>
      <div className="overflow-x-auto rounded border border-[color:var(--foreground)]/10">
        <table className="w-full text-sm">
          <caption className="sr-only">Visitor notes submitted from the public visitors board</caption>
          <thead className="bg-[color:var(--foreground)]/5 text-left">
            <tr>
              <th className="p-2 font-medium">Drawing</th>
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 font-medium">Message</th>
              <th className="p-2 font-medium">Created</th>
              <th className="p-2 font-medium">Image</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-[color:var(--foreground)]/50">
                  No visitor notes.
                </td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr key={note.id} className="border-t border-[color:var(--foreground)]/5">
                  <td className="p-2">
                    <div
                      className="relative h-20 w-24 overflow-hidden rounded border border-[color:var(--foreground)]/10 bg-[color:var(--foreground)]/5"
                      style={{ borderBottomColor: note.color }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={note.imageUrl}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </td>
                  <td className="max-w-[10rem] p-2 font-medium">{note.name}</td>
                  <td className="max-w-xs p-2 text-[color:var(--foreground)]/70">
                    {note.message ?? "—"}
                  </td>
                  <td className="p-2 font-mono text-xs">{note.createdAtIso}</td>
                  <td className="p-2 text-xs text-[color:var(--foreground)]/60">
                    {note.imageWidth}x{note.imageHeight} · {formatBytes(note.imageBytes)}
                  </td>
                  <td className="p-2">
                    <AdminActionButton
                      action={async (): Promise<AdminActionResult> => {
                        "use server";
                        return adminAction(async () => {
                          const result = await deleteVisitorNote(note.id);
                          return {
                            ok: true,
                            message: result.objectDeleted
                              ? "Visitor note deleted."
                              : "Visitor note deleted; private image cleanup will need a retry.",
                          };
                        });
                      }}
                      confirmMessage={`Delete visitor note from "${note.name}"?`}
                      pendingLabel="Deleting..."
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </AdminActionButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
