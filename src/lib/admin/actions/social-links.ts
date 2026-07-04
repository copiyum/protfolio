"use server";
import { socialLinksPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(socialLinksPlugin);

export const listSocialLinks = crud.list;
export const getSocialLink = crud.get;
export const createSocialLink = crud.create;
export const updateSocialLink = crud.update;
export const deleteSocialLink = crud.remove;
export const reorderSocialLinks = crud.reorder;
