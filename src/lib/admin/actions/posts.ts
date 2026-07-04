"use server";
import { postsPlugin } from "../entities";
import { defineEntityCrud } from "./entity-crud";

const crud = defineEntityCrud(postsPlugin);

export const listPosts = crud.list;
export const getPost = crud.get;
export const createPost = crud.create;
export const updatePost = crud.update;
export const deletePost = crud.remove;
