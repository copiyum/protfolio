import { z } from "zod";

export const BENTO_KINDS = ["custom", "nowPlaying", "github", "map", "typing", "visitors", "showcase"] as const;

export const BentoCellInput = z.object({
  id: z.string().min(1),
  kind: z.enum(BENTO_KINDS),
  label: z.string().min(1).max(100),
  value: z.string().max(200).nullable().optional(),
  sub: z.string().max(200).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  col_span: z.number().int().min(1).max(4).default(1),
  row_span: z.number().int().min(1).max(4).default(1),
  sort_order: z.number().int().default(1000),
  visible: z.boolean().default(true),
  visibility_window: z
    .object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
      tz: z.string(),
    })
    .nullable()
    .optional(),
});
export type BentoCellInput = z.infer<typeof BentoCellInput>;