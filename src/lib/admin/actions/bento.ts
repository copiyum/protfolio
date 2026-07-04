"use server";
import { bentoPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(bentoPlugin);

export const listBentoCells = crud.list;
export const getBentoCell = crud.get;
export const createBentoCell = crud.create;
export const updateBentoCell = crud.update;
export const deleteBentoCell = crud.remove;
export const reorderBentoCells = crud.reorder;
