import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useForm } from "react-hook-form";

import { createCvAudit } from "@/services/cv-api";
import { getSeniorityLevels } from "@/services/career-api";
import {
  cvUploadSchema,
  type CvUploadFormValues,
  type CvUploadValues,
} from "@/schemas/cv-audit.schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobCategoryPicker } from "@/components/job-category-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuditStore } from "@/stores/audit-store";
import type { AuditSummary } from "@/types/cv";

interface CvUploadFormProps {
  onAuditComplete: (audit: AuditSummary) => void;
}

export function CvUploadForm({ onAuditComplete }: CvUploadFormProps) {
  const setSelectedFeedbackId = useAuditStore(
    (state) => state.setSelectedFeedbackId,
  );

  const form = useForm<CvUploadFormValues, unknown, CvUploadValues>({
    resolver: zodResolver(cvUploadSchema),
    defaultValues: {
      jobCategoryId: 0,
      seniorityLevelId: "",
      targetRole: "",
    },
  });
  const seniorityQuery = useQuery({
    queryKey: ["seniority-levels"],
    queryFn: getSeniorityLevels,
  });

  const auditMutation = useMutation({
    mutationFn: createCvAudit,
    onSuccess: (audit) => {
      setSelectedFeedbackId(audit.detailed_feedbacks[0]?.id ?? null);
      onAuditComplete(audit);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    auditMutation.mutate(values);
  });

  const resumeError = form.formState.errors.resume?.message;
  const jobCategoryError = form.formState.errors.jobCategoryId?.message;
  const seniorityError = form.formState.errors.seniorityLevelId?.message;

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="text-base">Start CV audit</CardTitle>
        <CardDescription>
          Upload a PDF and define the target role for the first audit flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <JobCategoryPicker
            error={jobCategoryError}
            onChange={(ids, label) => {
              form.setValue("jobCategoryId", ids[0] ?? 0, {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue("targetRole", label, {
                shouldDirty: true,
                shouldValidate: false,
              });
            }}
          />

          <div className="space-y-2">
            <Label htmlFor="seniorityLevelId">Seniority / position level</Label>
            <select
              id="seniorityLevelId"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={seniorityQuery.isLoading}
              {...form.register("seniorityLevelId")}
            >
              <option value="">
                {seniorityQuery.isLoading ? "Loading..." : "Choose level"}
              </option>
              {seniorityQuery.data?.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.displayName}
                </option>
              ))}
            </select>
            {seniorityError ? (
              <p className="text-sm text-destructive">{seniorityError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Resume PDF</Label>
            <Input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setSelectedFeedbackId(null);
                }
                form.setValue("resume", file as File, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {resumeError ? (
              <p className="text-sm text-destructive">{resumeError}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={auditMutation.isPending || seniorityQuery.isLoading}
          >
            <Upload className="size-4" />
            {auditMutation.isPending ? "Submitting..." : "Queue audit"}
          </Button>
          {auditMutation.isError ? (
            <p className="text-sm text-destructive">
              {auditMutation.error instanceof Error
                ? auditMutation.error.message
                : "Audit failed."}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
