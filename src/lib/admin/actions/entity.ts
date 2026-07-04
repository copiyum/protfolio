"use server";

import { getEntityPlugin } from "../entities";
import { defineAnyEntityCrud } from "./entity-crud";

type EntityActions = {
  create: (input: unknown) => Promise<{ ok: true; id: string }>;
  update: (id: string, input: unknown) => Promise<{ ok: true }>;
  remove: (id: string) => Promise<{ ok: true }>;
};

const crudCache = new Map<string, EntityActions>();

function getActions(entity: string): EntityActions {
  const cached = crudCache.get(entity);
  if (cached) return cached;
  const plugin = getEntityPlugin(entity);
  if (!plugin) throw new Error("Unknown admin entity");
  const actions = defineAnyEntityCrud(plugin) as EntityActions;
  crudCache.set(entity, actions);
  return actions;
}

export async function createEntity(entity: string, input: unknown): Promise<{ ok: true; id: string }> {
  return getActions(entity).create(input);
}

export async function updateEntity(entity: string, id: string, input: unknown): Promise<{ ok: true }> {
  return getActions(entity).update(id, input);
}

export async function deleteEntity(entity: string, id: string): Promise<{ ok: true }> {
  return getActions(entity).remove(id);
}
