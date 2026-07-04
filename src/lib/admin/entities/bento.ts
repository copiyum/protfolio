import { BentoCellInput, type BentoCellInput as BentoCellInputType } from "../schema/bento";
import type { EntityPlugin } from "./types";

export type BentoCell = {
  id: string;
  kind: "custom" | "nowPlaying" | "github" | "map" | "typing" | "visitors" | "showcase";
  label: string;
  value: string;
  sub: string;
  payload: Record<string, unknown>;
  colSpan: number;
  rowSpan: number;
};

type BentoRow = {
  id: string;
  kind: string;
  label: string;
  value: string | null;
  sub: string | null;
  payload: string;
  col_span: number;
  row_span: number;
};

export async function getFallbackBentoCells(): Promise<BentoCell[]> {
  const { bentoCustomCell } = await import("@/data/bento");
  return [{ ...bentoCustomCell, id: "custom-default", kind: "custom", payload: {}, colSpan: 1, rowSpan: 1 }];
}

export const bentoPlugin = {
  slug: "bento",
  label: "Bento Cells",
  tag: "bento",
  schema: BentoCellInput,
  db: {
    table: "bento_cells",
    columns: [
      "id",
      "kind",
      "label",
      "value",
      "sub",
      "payload",
      "col_span",
      "row_span",
      "sort_order",
      "visible",
      "visibility_window",
    ],
    jsonColumns: ["payload", "visibility_window"],
    booleanColumns: ["visible"],
  },
  fallback: getFallbackBentoCells,
  async read(db) {
    const rows = await db
      .prepare(
        `SELECT id, kind, label, value, sub, payload, col_span, row_span
         FROM bento_cells
         WHERE visible = 1
         ORDER BY sort_order`,
      )
      .all<BentoRow>();
    if (!rows.results.length) throw new Error("No bento cells in D1");
    return rows.results.map((row) => ({
      id: row.id,
      kind: row.kind as BentoCell["kind"],
      label: row.label,
      value: row.value ?? "",
      sub: row.sub ?? "",
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      colSpan: row.col_span,
      rowSpan: row.row_span,
    }));
  },
  admin: {
    columns: [
      { key: "kind", label: "Kind" },
      { key: "label", label: "Label" },
      { key: "visible", label: "Visible" },
    ],
  },
} satisfies EntityPlugin<BentoCell, BentoCellInputType>;
