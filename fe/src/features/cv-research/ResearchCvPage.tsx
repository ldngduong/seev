import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileSearch,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { DashboardPageHeader } from "@/components/layouts/DashboardPageHeader";
import { JobCategoryPicker } from "@/components/job-category-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox, MultiCombobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { VIETNAM_PROVINCES } from "@/lib/vietnam-provinces";
import { getSeniorityLevels } from "@/services/career-api";
import {
  createCustomCvResearch,
  createQuickCvResearch,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
} from "@/services/cv-api";

type ResearchMode = "quick" | "custom";

export const ResearchCvPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ResearchMode | null>(null);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [seniorityLevelId, setSeniorityLevelId] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const cvsQuery = useQuery({
    queryKey: ["user-cvs", { page: 1, status: "ready", purpose: "research" }],
    queryFn: () =>
      listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE, status: "ready" }),
  });
  const seniorityQuery = useQuery({
    queryKey: ["seniority-levels", selectedCategoryId],
    queryFn: () => getSeniorityLevels(selectedCategoryId),
    enabled: Boolean(selectedCategoryId),
  });

  useEffect(() => {
    const cvId = searchParams.get("cvId");
    if (cvId) setSelectedCvId(cvId);
  }, [searchParams]);

  const handleCreated = (session: { id: string }) => {
    void navigate(`/research-history/${session.id}`);
  };
  const quickMutation = useMutation({
    mutationFn: createQuickCvResearch,
    onSuccess: handleCreated,
  });
  const customMutation = useMutation({
    mutationFn: createCustomCvResearch,
    onSuccess: handleCreated,
  });
  const isSubmitting = quickMutation.isPending || customMutation.isPending;
  const hasCustomTarget = Boolean(selectedCategoryId && seniorityLevelId);

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="Research mới"
        actions={
          <Link
            to="/research-history"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft />
            Lịch sử research
          </Link>
        }
      />

      {!mode ? (
        <section className="grid overflow-hidden rounded-2xl border border-border/60 bg-card md:grid-cols-2 md:divide-x md:divide-border/60">
          <ResearchModeButton
            icon={Sparkles}
            title="Research nhanh"
            description="Dùng định hướng sẵn có của CV để đánh giá nội dung và tìm việc làm phù hợp."
            onClick={() => setMode("quick")}
          />
          <ResearchModeButton
            icon={SlidersHorizontal}
            title="Research tùy chỉnh"
            description="So sánh CV với nhóm ngành, cấp bậc hoặc mô tả công việc đã chọn."
            onClick={() => setMode("custom")}
          />
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-700">
                {mode === "quick" ? "Research nhanh" : "Research tùy chỉnh"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "quick"
                  ? "Chọn CV bạn muốn Seev phân tích."
                  : "Chọn CV và cung cấp ngữ cảnh vị trí bạn muốn so sánh."}
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setMode(null)}>
              Đổi chế độ
            </Button>
          </div>

          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="userCvId">CV</Label>
              <Combobox
                id="userCvId"
                value={selectedCvId}
                onChange={(value) => setSelectedCvId(String(value))}
                disabled={cvsQuery.isLoading || isSubmitting}
                placeholder={
                  cvsQuery.isLoading ? "Đang tải CV..." : "Tìm CV đã lưu"
                }
                searchPlaceholder="Tìm theo tên CV..."
                emptyMessage="Không tìm thấy CV phù hợp"
                options={(cvsQuery.data?.items ?? []).map((cv) => ({
                  value: cv.id,
                  label: cv.name,
                }))}
              />
            </div>

            {mode === "custom" ? (
              <div className="grid gap-5 border-t pt-5">
                <JobCategoryPicker
                  onChange={(ids) => {
                    setSelectedCategoryId(ids[0] ?? "");
                    setSeniorityLevelId("");
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="seniorityLevelId">Cấp bậc hoặc vị trí</Label>
                  <Select
                    value={seniorityLevelId}
                    onValueChange={(value) => setSeniorityLevelId(value ?? "")}
                    disabled={
                      !selectedCategoryId ||
                      seniorityQuery.isLoading ||
                      isSubmitting
                    }
                    items={(seniorityQuery.data ?? []).map((level) => ({
                      value: level.id,
                      label: level.displayName,
                    }))}
                  >
                    <SelectTrigger
                      id="seniorityLevelId"
                      className="w-full border-border bg-background"
                      aria-label="Chọn cấp bậc"
                    >
                      <SelectValue placeholder="Chọn cấp bậc nếu có" />
                    </SelectTrigger>
                    <SelectContent>
                      {seniorityQuery.data?.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locations">Địa điểm làm việc</Label>
                  <MultiCombobox
                    id="locations"
                    value={locations}
                    onChange={(value) => setLocations(value.map(String))}
                    disabled={isSubmitting}
                    options={VIETNAM_PROVINCES.map((province) => ({
                      value: province,
                      label: province,
                    }))}
                    placeholder="Chọn tỉnh/thành phố"
                    searchPlaceholder="Tìm tỉnh/thành phố..."
                    emptyMessage="Không tìm thấy tỉnh/thành phố"
                    clearLabel="Bỏ chọn tất cả"
                    selectedLabel={(selected) =>
                      selected.length === 1
                        ? selected[0].label
                        : `${selected.length} tỉnh/thành phố được chọn`
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Bắt buộc chọn nhóm ngành và cấp bậc. Bạn có thể bỏ trống
                    hoặc chọn một hoặc nhiều tỉnh thành phố.
                  </p>
                </div>
              </div>
            ) : null}

            {quickMutation.isError || customMutation.isError ? (
              <p className="text-sm text-destructive">
                Không thể bắt đầu research. Kiểm tra CV đã chọn và thử lại.
              </p>
            ) : null}

            <div className="flex justify-end border-t pt-5">
              <Button
                type="button"
                disabled={
                  !selectedCvId ||
                  isSubmitting ||
                  (mode === "custom" && !hasCustomTarget)
                }
                onClick={() => {
                  if (mode === "quick") {
                    quickMutation.mutate(selectedCvId);
                    return;
                  }
                  customMutation.mutate({
                    userCvId: selectedCvId,
                    jobCategoryId: selectedCategoryId || undefined,
                    seniorityLevelId: seniorityLevelId || undefined,
                    locations: locations.length ? locations : undefined,
                  });
                }}
              >
                <FileSearch />
                {isSubmitting ? "Đang bắt đầu..." : "Bắt đầu research"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

function ResearchModeButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-44 items-start gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-xl font-semibold text-zinc-700">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
