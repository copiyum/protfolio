"use server";
import { experiencesPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(experiencesPlugin);

export const listExperiences = crud.list;
export const getExperience = crud.get;
export const createExperience = crud.create;
export const updateExperience = crud.update;
export const deleteExperience = crud.remove;
export const reorderExperiences = crud.reorder;
