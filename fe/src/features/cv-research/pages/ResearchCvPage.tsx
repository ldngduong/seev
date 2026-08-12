import {
  ArrowLeft,
  FileInput,
  FileSearch,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";

import { DashboardPageHeader } from "@/shared/components/layouts/DashboardPageHeader";
import { ResearchModeButton } from '@/features/cv-research/components/research-mode-button'
import { useResearchCvPage } from '@/features/cv-research/hooks/use-research-cv-page'
import { JobCategoryPicker } from "@/entities/career-taxonomy/components/job-category-picker";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Combobox, MultiCombobox } from "@/shared/components/ui/combobox";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { VIETNAM_PROVINCES } from "@/features/cv-research/utils/vietnam-provinces";
import { ExternalJobResearchForm } from '@/features/external-job-research/components/external-job-research-form'

export const ResearchCvPage = () => {
  const research = useResearchCvPage();
  const { mode, setMode, selectedCvId, setSelectedCvId, selectedCategoryId,
    setSelectedCategoryId, seniorityLevelId, setSeniorityLevelId, locations,
    setLocations, isSubmitting, hasCustomTarget } = research;

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
        <section className="grid overflow-hidden rounded-2xl border border-border/60 bg-card md:grid-cols-3 md:divide-x md:divide-border/60">
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
          <ResearchModeButton
            icon={FileInput}
            title="Theo nội dung tuyển dụng"
            description="Đối chiếu CV với JD hoặc liên kết tuyển dụng do bạn cung cấp."
            onClick={() => setMode("external")}
          />
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-5 flex flex-col items-start gap-3 border-b pb-4 sm:flex-row sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-700">
                {mode === "quick" ? "Research nhanh" : mode === 'custom' ? "Research tùy chỉnh" : 'Theo nội dung tuyển dụng'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "quick"
                  ? "Chọn CV bạn muốn Seev phân tích."
                  : mode === 'custom' ? "Chọn CV và cung cấp ngữ cảnh vị trí bạn muốn so sánh." : 'Chọn CV rồi cung cấp JD hoặc liên kết tuyển dụng.'}
              </p>
            </div>
            <Button type="button" variant="ghost" className="self-end sm:self-auto" onClick={() => setMode(null)}>
              Đổi chế độ
            </Button>
          </div>

          {mode === 'external' ? <ExternalJobResearchForm /> : <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="userCvId">CV</Label>
              <Combobox
                id="userCvId"
                value={selectedCvId}
                onChange={(value) => setSelectedCvId(String(value))}
                disabled={research.isCvsLoading || isSubmitting}
                placeholder={
                  research.isCvsLoading ? "Đang tải CV..." : "Tìm CV đã lưu"
                }
                searchPlaceholder="Tìm theo tên CV..."
                emptyMessage="Không tìm thấy CV phù hợp"
                options={research.cvs.map((cv) => ({
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
                      research.isSeniorityLoading ||
                      isSubmitting
                    }
                    items={research.seniorityLevels.map((level) => ({
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
                      {research.seniorityLevels.map((level) => (
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

            {research.price !== null ? <p className="text-sm text-muted-foreground">Chi phí: <strong className="text-foreground">{research.price} credits</strong>{research.balance !== null ? ` · Số dư ${research.balance} credits` : ''}</p> : null}

            <div className="flex justify-end border-t pt-5">
              <Button
                type="button"
                disabled={
                  !selectedCvId ||
                  isSubmitting ||
                  (mode === "custom" && !hasCustomTarget)
                  || !research.hasEnoughCredits
                }
                onClick={research.submit}
              >
                <FileSearch />
                {isSubmitting ? "Đang bắt đầu..." : "Bắt đầu research"}
              </Button>
            </div>
          </div>}
        </section>
      )}
    </main>
  );
};
