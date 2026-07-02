"use server";
import { defineCrud } from "./_crud";
import { TechInput } from "../schema/tech-stack";

const cols = ["id", "name", "icon", "category", "sort_order", "published"] as const;

const crud = defineCrud({
  table: "tech_stack",
  tag: "tech-stack",
  columns: cols,
  schema: {
    parse: (i) => TechInput.parse(i),
    partial: () => ({ parse: (i) => TechInput.partial().parse(i) }),
  },
});

export const listTech = crud.list;
export const getTech = crud.get;
export const createTech = crud.create;
export const updateTech = crud.update;
export const deleteTech = crud.remove;
export const reorderTech = crud.reorder;