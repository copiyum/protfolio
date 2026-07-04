import { z } from "zod";

export const FeatureFlagInput = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/),
  value: z.union([z.boolean(), z.string(), z.number(), z.record(z.string(), z.unknown())]),
});
export type FeatureFlagInput = z.infer<typeof FeatureFlagInput>;