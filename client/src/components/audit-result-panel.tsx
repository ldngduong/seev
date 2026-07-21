import { Lightbulb, MessageSquareText, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuditStore } from "@/stores/audit-store";
import type { AuditSummary } from "@/types/cv";

interface AuditResultPanelProps {
  audit: AuditSummary | null;
}

export function AuditResultPanel({ audit }: AuditResultPanelProps) {
  const closeFeedbackPopover = useAuditStore(
    (state) => state.closeFeedbackPopover,
  );
  const generalFeedbacks = audit?.general_feedbacks ?? [];
  const scoreBreakdown = audit?.score_breakdown ?? [];

  if (!audit) {
    return (
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">AI feedback</CardTitle>
          <CardDescription>
            Feedback, keyword suggestions, and matching roles appear after the
            backend returns the DeepSeek audit.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">AI score</CardTitle>
            <CardDescription>{audit.summary}</CardDescription>
          </div>
          <div className="text-3xl font-semibold">{audit.overall_score}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={audit.overall_score} />

        {scoreBreakdown.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span>Weighted score breakdown</span>
              <Badge variant="outline">
                {scoreBreakdown.reduce((total, item) => total + item.score, 0)}
                /
                {scoreBreakdown.reduce(
                  (total, item) => total + item.max_score,
                  0,
                )}
              </Badge>
            </div>
            {scoreBreakdown.map((item) => (
              <div key={item.dimension} className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{item.dimension}</p>
                  <Badge variant="outline">
                    {item.score}/{item.max_score}
                  </Badge>
                </div>
                <Progress value={(item.score / item.max_score) * 100} />
                <p className="mt-2 text-muted-foreground">{item.rationale}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareText className="size-4" />
            Nhận xét tổng quan
          </div>
          <div className="space-y-2">
            {generalFeedbacks.length > 0 ? (
              generalFeedbacks.map((feedback) => (
                <div key={feedback.id} className="rounded-md border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        feedback.severity === "critical"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {feedback.topic}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {feedback.severity}
                    </span>
                  </div>
                  <p className="font-medium">{feedback.comment}</p>
                  {feedback.recommendation ? (
                    <p className="mt-2 rounded-md border bg-muted/40 p-2 text-muted-foreground">
                      {feedback.recommendation}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Không có nhận xét tổng quan riêng. Các nhận xét chi tiết đang
                được gắn trực tiếp trên PDF.
              </p>
            )}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="size-4" />
            Keywords
          </div>
          <div className="flex flex-wrap gap-2">
            {audit.suggested_keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4" />
            Role and job fit
          </div>
          <div className="flex flex-wrap gap-2">
            {audit.suggested_roles.map((role) => (
              <Badge key={role}>{role}</Badge>
            ))}
          </div>
          <div className="space-y-2">
            {audit.suggested_jobs.map((job) => (
              <div key={job.title} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{job.title}</p>
                  <Badge variant="secondary">{job.match_level}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{job.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => closeFeedbackPopover()}
        >
          Clear highlight
        </Button>
      </CardContent>
    </Card>
  );
}
