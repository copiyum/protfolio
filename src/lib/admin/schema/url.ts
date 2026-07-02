import { z } from "zod";

export const HttpsUrl = z.string().trim().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Expected an https URL");

export const OptionalHttpsUrl = HttpsUrl.nullable().optional();

export const InternalPath = z.string().trim().regex(/^\/(?!\/)/, "Expected an internal path");
