import { z } from "zod";

export const AllowedContentTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const zUploadSignRequest = z
  .object({
    contentType: z.enum(AllowedContentTypes).optional(),
    ext: z.enum(["jpg", "jpeg", "png", "webp"]).optional(),
  })
  .strict();

