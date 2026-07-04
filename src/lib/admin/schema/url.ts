import { z } from "zod";

function isSafeInternalPath(value: string): boolean {
  if (value === "#") return true;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  const rawPath = value.split(/[?#]/, 1)[0];
  if (rawPath.split("/").some((part) => part === ".." || part === ".")) return false;
  try {
    const url = new URL(value, "https://sarang.dev");
    if (url.origin !== "https://sarang.dev") return false;
    if (!url.pathname.startsWith("/")) return false;
    return true;
  } catch {
    return false;
  }
}

export const HttpsUrl = z.string().trim().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Expected an https URL");

export const OptionalHttpsUrl = z.string().trim().refine((value) => {
  if (isSafeInternalPath(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Expected an https URL or internal path").nullable().optional();

export const InternalPath = z.string().trim().refine(isSafeInternalPath, "Expected a safe internal path");
