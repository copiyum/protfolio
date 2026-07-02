"use server";
import { defineCrud } from "./_crud";
import { NavItemInput } from "../schema/nav";

const cols = ["id", "label", "href", "sort_order", "visible"] as const;

const crud = defineCrud({
  table: "nav_items",
  tag: "nav",
  columns: cols,
  schema: {
    parse: (i) => NavItemInput.parse(i),
    partial: () => ({ parse: (i) => NavItemInput.partial().parse(i) }),
  },
});

export const listNav = crud.list;
export const getNav = crud.get;
export const createNav = crud.create;
export const updateNav = crud.update;
export const deleteNav = crud.remove;
export const reorderNav = crud.reorder;