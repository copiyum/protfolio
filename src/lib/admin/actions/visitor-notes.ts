"use server";
import { updateTag } from "next/cache";
import { requireActionAdmin } from "./_security";
import { deleteVisitorNoteWithAdmin } from "../visitor-notes";

export async function deleteVisitorNote(id: string): Promise<{ ok: true; objectDeleted: boolean }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  return deleteVisitorNoteWithAdmin(admin, id, updateTag);
}
