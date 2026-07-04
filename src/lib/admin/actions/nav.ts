"use server";
import { navPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(navPlugin);

export const listNav = crud.list;
export const getNav = crud.get;
export const createNav = crud.create;
export const updateNav = crud.update;
export const deleteNav = crud.remove;
export const reorderNav = crud.reorder;
