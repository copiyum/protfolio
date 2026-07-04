"use server";
import { techStackPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(techStackPlugin);

export const listTech = crud.list;
export const getTech = crud.get;
export const createTech = crud.create;
export const updateTech = crud.update;
export const deleteTech = crud.remove;
export const reorderTech = crud.reorder;
