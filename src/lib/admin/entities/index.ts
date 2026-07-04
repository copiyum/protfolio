import { bentoPlugin } from "./bento";
import { experiencesPlugin } from "./experiences";
import { navPlugin } from "./nav";
import { postsPlugin } from "./posts";
import { projectsPlugin } from "./projects";
import { socialLinksPlugin } from "./social-links";
import { techStackPlugin } from "./tech-stack";
import { ENTITY_SLUGS, type AnyEntityPlugin, type EntitySlug } from "./types";

export { bentoPlugin, getFallbackBentoCells, type BentoCell } from "./bento";
export { experiencesPlugin } from "./experiences";
export { fallbackNav, navPlugin, type NavItem } from "./nav";
export { postsPlugin } from "./posts";
export { projectsPlugin } from "./projects";
export { socialLinksPlugin } from "./social-links";
export { techStackPlugin } from "./tech-stack";
export type { AnyEntityPlugin, EntityAdminColumn, EntityDbConfig, EntityPlugin, EntitySlug } from "./types";

export const entityPlugins = [
  postsPlugin,
  projectsPlugin,
  experiencesPlugin,
  socialLinksPlugin,
  techStackPlugin,
  bentoPlugin,
  navPlugin,
] as const;

export const entityPluginsBySlug = Object.fromEntries(
  entityPlugins.map((plugin) => [plugin.slug, plugin]),
) as unknown as Record<EntitySlug, AnyEntityPlugin>;

export function isEntitySlug(value: string): value is EntitySlug {
  return ENTITY_SLUGS.includes(value as EntitySlug);
}

export function getEntityPlugin(value: string): AnyEntityPlugin | null {
  return isEntitySlug(value) ? entityPluginsBySlug[value] : null;
}
