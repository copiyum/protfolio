"use server";
import { defineCrud } from "./_crud";
import { SocialLinkInput } from "../schema/social-links";

const cols = ["id", "label", "href", "sort_order", "published"] as const;

const crud = defineCrud({
  table: "social_links",
  tag: "social-links",
  columns: cols,
  schema: {
    parse: (i) => SocialLinkInput.parse(i),
    partial: () => ({ parse: (i) => SocialLinkInput.partial().parse(i) }),
  },
});

export const listSocialLinks = crud.list;
export const getSocialLink = crud.get;
export const createSocialLink = crud.create;
export const updateSocialLink = crud.update;
export const deleteSocialLink = crud.remove;
export const reorderSocialLinks = crud.reorder;