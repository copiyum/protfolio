"use server";
import { projectsPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(projectsPlugin);

export const listProjects = crud.list;
export const getProject = crud.get;
export const createProject = crud.create;
export const updateProject = crud.update;
export const deleteProject = crud.remove;
export const reorderProjects = crud.reorder;
