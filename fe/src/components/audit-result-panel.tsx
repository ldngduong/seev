import { Lightbulb, MessageSquareText, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type {
  AuditSummary,
  FeedbackSeverity,
  SuggestedJob,
} from "@/types/cv";

interface AuditResultPanelProps {
  audit: AuditSummary | null;
}

const SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
  critical: "Nghiêm trọng",
  warning: "Cảnh báo",
  info: "Thông tin",
};

const MATCH_LEVEL_LABELS: Record<SuggestedJob["match_level"], string> = {
  high: "Khớp cao",
  medium: "Khớp trung bình",
  stretch: "Cần nỗ lực",
};

export function AuditResultPanel({ audit }: AuditResultPanelProps) {
  if (!audit) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Phản hồi AI
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Phản hồi, gợi ý từ khóa và vai trò khớp sẽ xuất hiện sau khi backend
          trả kết quả audit.
        </p>
      </section>
    );
  }

  const generalFeedbacks = audit?.general_feedbacks ?? [];
  const scoreBreakdown = audit?.score_breakdown ?? [];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Điểm AI
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {audit.summary}
          </p>
        </div>
        <span className="shrink-0 text-4xl font-semibold tabular-nums tracking-tight text-zinc-800">
          {audit.overall_score}
        </span>
      </header>

      <div>
        <Progress value={audit.overall_score} className="h-1.5" />
      </div>

      {scoreBreakdown.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Chi tiết điểm theo trọng số
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {scoreBreakdown.reduce((total, item) => total + item.score, 0)}/
              {scoreBreakdown.reduce(
                (total, item) => total + item.max_score,
                0,
              )}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {scoreBreakdown.map((item) => (
              <div key={item.dimension} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-medium text-zinc-800">{item.dimension}</p>
                  <span className="tabular-nums text-muted-foreground">
                    {item.score}/{item.max_score}
                  </span>
                </div>
                <Progress
                  value={(item.score / item.max_score) * 100}
                  className="h-1.5"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <MessageSquareText className="size-3.5" />
          Nhận xét tổng quan
        </h3>
        {generalFeedbacks.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/60">
            {generalFeedbacks.map((feedback) => (
              <div key={feedback.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex items-center justify-between gap-2">
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
                    {SEVERITY_LABELS[feedback.severity]}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-800">
                  {feedback.comment}
                </p>
                {feedback.recommendation ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feedback.recommendation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Không có nhận xét tổng quan riêng. Các nhận xét chi tiết đang được
            gắn trực tiếp trên PDF.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Lightbulb className="size-3.5" />
          Từ khóa
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {audit.suggested_keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-zinc-600"
            >
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Target className="size-3.5" />
          Độ khớp vị trí
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {audit.suggested_roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {role}
            </span>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-border/60">
          {audit.suggested_jobs.map((job) => (
            <div key={job.title} className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-800">{job.title}</p>
                <span className="text-xs text-muted-foreground">
                  {MATCH_LEVEL_LABELS[job.match_level]}
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {job.reason}
              </p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
