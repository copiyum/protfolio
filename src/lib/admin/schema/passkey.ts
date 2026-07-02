import { z } from "zod";

export const PasskeyRegisterInput = z.object({
  attestationResponse: z.unknown(),
  name: z.string().min(1).max(100),
});
export const PasskeyAssertInput = z.object({
  assertionResponse: z.unknown(),
});