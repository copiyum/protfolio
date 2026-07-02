"use server";
import { defineCrud } from "./_crud";
import { BentoCellInput } from "../schema/bento";

const cols = [
  "id", "kind", "label", "value", "sub", "payload",
  "col_span", "row_span", "sort_order", "visible", "visibility_window",
] as const;

const crud = defineCrud({
  table: "bento_cells",
  tag: "bento",
  columns: cols,
  jsonColumns: ["payload", "visibility_window"],
  schema: {
    parse: (i) => BentoCellInput.parse(i),
    partial: () => ({ parse: (i) => BentoCellInput.partial().parse(i) }),
  },
});

export const listBentoCells = crud.list;
export const getBentoCell = crud.get;
export const createBentoCell = crud.create;
export const updateBentoCell = crud.update;
export const deleteBentoCell = crud.remove;
export const reorderBentoCells = crud.reorder;