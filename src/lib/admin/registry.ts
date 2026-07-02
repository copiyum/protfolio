import type { z } from "zod";

import { listPosts, getPost, createPost, updatePost, deletePost } from "@/lib/admin/actions/posts";
import { listProjects, getProject, createProject, updateProject, deleteProject } from "@/lib/admin/actions/projects";
import { listExperiences, getExperience, createExperience, updateExperience, deleteExperience } from "@/lib/admin/actions/experiences";
import { listSocialLinks, getSocialLink, createSocialLink, updateSocialLink, deleteSocialLink } from "@/lib/admin/actions/social-links";
import { listTech, getTech, createTech, updateTech, deleteTech } from "@/lib/admin/actions/tech-stack";
import { listBentoCells, getBentoCell, createBentoCell, updateBentoCell, deleteBentoCell } from "@/lib/admin/actions/bento";
import { listNav, getNav, createNav, updateNav, deleteNav } from "@/lib/admin/actions/nav";

import { PostInput } from "./schema/posts";
import { ProjectInput } from "./schema/projects";
import { ExperienceInput } from "./schema/experiences";
import { SocialLinkInput } from "./schema/social-links";
import { TechInput } from "./schema/tech-stack";
import { BentoCellInput } from "./schema/bento";
import { NavItemInput } from "./schema/nav";

type CrudActions = {
  list: () => Promise<{ id: string }[]>;
  get: (id: string) => Promise<{ id: string } | null>;
  create: (input: unknown) => Promise<{ ok: true; id: string }>;
  update: (id: string, input: unknown) => Promise<{ ok: true }>;
  remove: (id: string) => Promise<{ ok: true }>;
};

export interface EntityConfig {
  label: string;
  actions: CrudActions;
  schema: z.ZodObject<z.ZodRawShape>;
  columns: { key: string; label: string }[];
}

export const registry: Record<string, EntityConfig> = {
  posts: {
    label: "Posts",
    actions: {
      list: listPosts as CrudActions["list"],
      get: getPost as CrudActions["get"],
      create: createPost as CrudActions["create"],
      update: updatePost as CrudActions["update"],
      remove: deletePost as CrudActions["remove"],
    },
    schema: PostInput,
    columns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "date", label: "Date" },
    ],
  },
  projects: {
    label: "Projects",
    actions: {
      list: listProjects as CrudActions["list"],
      get: getProject as CrudActions["get"],
      create: createProject as CrudActions["create"],
      update: updateProject as CrudActions["update"],
      remove: deleteProject as CrudActions["remove"],
    },
    schema: ProjectInput,
    columns: [
      { key: "title", label: "Title" },
      { key: "period", label: "Period" },
    ],
  },
  experiences: {
    label: "Experience",
    actions: {
      list: listExperiences as CrudActions["list"],
      get: getExperience as CrudActions["get"],
      create: createExperience as CrudActions["create"],
      update: updateExperience as CrudActions["update"],
      remove: deleteExperience as CrudActions["remove"],
    },
    schema: ExperienceInput,
    columns: [
      { key: "company", label: "Company" },
      { key: "role", label: "Role" },
      { key: "period", label: "Period" },
    ],
  },
  "social-links": {
    label: "Social Links",
    actions: {
      list: listSocialLinks as CrudActions["list"],
      get: getSocialLink as CrudActions["get"],
      create: createSocialLink as CrudActions["create"],
      update: updateSocialLink as CrudActions["update"],
      remove: deleteSocialLink as CrudActions["remove"],
    },
    schema: SocialLinkInput,
    columns: [
      { key: "label", label: "Label" },
      { key: "href", label: "URL" },
    ],
  },
  "tech-stack": {
    label: "Tech Stack",
    actions: {
      list: listTech as CrudActions["list"],
      get: getTech as CrudActions["get"],
      create: createTech as CrudActions["create"],
      update: updateTech as CrudActions["update"],
      remove: deleteTech as CrudActions["remove"],
    },
    schema: TechInput,
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
    ],
  },
  bento: {
    label: "Bento Cells",
    actions: {
      list: listBentoCells as CrudActions["list"],
      get: getBentoCell as CrudActions["get"],
      create: createBentoCell as CrudActions["create"],
      update: updateBentoCell as CrudActions["update"],
      remove: deleteBentoCell as CrudActions["remove"],
    },
    schema: BentoCellInput,
    columns: [
      { key: "kind", label: "Kind" },
      { key: "label", label: "Label" },
      { key: "visible", label: "Visible" },
    ],
  },
  nav: {
    label: "Nav Items",
    actions: {
      list: listNav as CrudActions["list"],
      get: getNav as CrudActions["get"],
      create: createNav as CrudActions["create"],
      update: updateNav as CrudActions["update"],
      remove: deleteNav as CrudActions["remove"],
    },
    schema: NavItemInput,
    columns: [
      { key: "label", label: "Label" },
      { key: "href", label: "Href" },
      { key: "visible", label: "Visible" },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(registry);
