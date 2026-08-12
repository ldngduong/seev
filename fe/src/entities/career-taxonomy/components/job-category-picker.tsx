import { ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";
import type { JobCategory } from '@/entities/career-taxonomy/types/career-taxonomy.types'
import { useJobCategoryPicker } from '@/entities/career-taxonomy/hooks/use-job-category-picker'

interface JobCategoryPickerProps {
  value?: string | null;
  error?: string;
  onChange: (ids: string[], label: string) => void;
  showLabel?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  className?: string;
}

export function JobCategoryPicker({
  value,
  error,
  onChange,
  showLabel = true,
  allowClear = false,
  placeholder = "Chọn chuyên môn CNTT",
  className,
}: JobCategoryPickerProps) {
  const picker = useJobCategoryPicker(value, onChange);

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? <Label>Chuyên môn CNTT</Label> : null}
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 text-left font-normal",
          !picker.selectedLabel && "text-muted-foreground",
        )}
        onClick={picker.openPicker}
      >
        <span className="line-clamp-2">
          {picker.selectedLabel || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0" />
      </Button>

      <Dialog open={picker.open} onOpenChange={picker.setOpen}>
        <DialogContent className="max-h-[86vh] gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
          <DialogHeader className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Chọn chuyên môn CNTT</DialogTitle>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => picker.setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={picker.query}
                onChange={(event) => picker.setQuery(event.target.value)}
                placeholder="Tìm Backend, Network, Automation QA..."
                className="pl-9"
              />
            </div>
          </DialogHeader>

          <div className="grid min-h-[420px] grid-cols-[260px_minmax(280px,1fr)] overflow-hidden">
            <section className="border-r">
              <ColumnHeader>Nhóm chuyên môn</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {picker.visibleGroups.map((group) => (
                  <button
                    key={group.code}
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                      picker.activeGroup?.code === group.code && "bg-muted font-medium",
                    )}
                    onClick={() => picker.setActiveGroupCode(group.code)}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <ColumnHeader>Chuyên môn</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-3">
                {picker.isLoading ? <EmptyText>Đang tải...</EmptyText> : null}
                {!picker.isLoading && !picker.activeGroup ? (
                  <EmptyText>Không tìm thấy chuyên môn.</EmptyText>
                ) : null}
                {picker.activeGroup?.categories.map((category) => (
                  <CategoryOption
                    key={category.id}
                    category={category}
                    selected={picker.draftCategoryId === category.id}
                    onSelect={() => picker.setDraftCategoryId(category.id)}
                  />
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="items-center justify-end gap-2 border-t p-4 sm:justify-end">
            {allowClear && picker.selectedCategoryId ? (
              <Button type="button" variant="ghost" onClick={picker.clear}>Bỏ lọc</Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => picker.setOpen(false)}>Hủy</Button>
            <Button type="button" disabled={!picker.draftCategoryId} onClick={picker.choose}>Chọn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function CategoryOption({ category, selected, onSelect }: {
  category: JobCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
        selected && "bg-primary/5",
      )}
      onClick={onSelect}
    >
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-muted-foreground/40", selected && "border-primary")}>
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span>
        <span className={cn("block font-medium", selected && "text-primary")}>{category.name}</span>
        {category.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{category.description}</span> : null}
      </span>
    </button>
  );
}

function ColumnHeader({ children }: { children: string }) {
  return <div className="border-b px-3 py-2 text-xs font-medium uppercase text-muted-foreground">{children}</div>;
}

function EmptyText({ children }: { children: string }) {
  return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
