"use server";
import { defineCrud } from "./_crud";
import { ExperienceInput } from "../schema/experiences";

const cols = [
  "id", "company", "role", "employment_type", "period_start", "period_end",
  "icon", "description", "skills", "sort_order", "published",
] as const;

const crud = defineCrud({
  table: "experiences",
  tag: "experiences",
  columns: cols,
  jsonColumns: ["skills"],
  schema: {
    parse: (i) => ExperienceInput.parse(i),
    partial: () => ({ parse: (i) => ExperienceInput.partial().parse(i) }),
  },
});

export const listExperiences = crud.list;
export const getExperience = crud.get;
export const createExperience = crud.create;
export const updateExperience = crud.update;
export const deleteExperience = crud.remove;
export const reorderExperiences = crud.reorder;