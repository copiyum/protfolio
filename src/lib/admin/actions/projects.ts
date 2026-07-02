"use server";
import { defineCrud } from "./_crud";
import { ProjectInput } from "../schema/projects";

const cols = [
  "id", "title", "period_start", "period_end", "link", "logo", "description",
  "skills", "featured", "is_expanded", "sort_order", "published",
] as const;

const crud = defineCrud({
  table: "projects",
  tag: "projects",
  columns: cols,
  jsonColumns: ["skills"],
  schema: {
    parse: (i) => ProjectInput.parse(i),
    partial: () => ({ parse: (i) => ProjectInput.partial().parse(i) }),
  },
});

export const listProjects = crud.list;
export const getProject = crud.get;
export const createProject = crud.create;
export const updateProject = crud.update;
export const deleteProject = crud.remove;
export const reorderProjects = crud.reorder;