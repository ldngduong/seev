import { z } from "zod";

export const cvUploadSchema = z.object({
  resume: z
    .instanceof(File, { message: "Please choose a PDF resume." })
    .refine(
      (file) => file.type === "application/pdf",
      "Only PDF files are supported.",
    )
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "PDF must be 5MB or smaller.",
    ),
  jobCategoryId: z.number().int().min(1, "Please choose a job category."),
  seniorityLevelId: z.string().uuid("Please choose a seniority level."),
  targetRole: z.string().trim().optional(),
});

export type CvUploadFormValues = z.input<typeof cvUploadSchema>;
export type CvUploadValues = z.output<typeof cvUploadSchema>;
