import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getJobCategoryTree,
  type JobCategory,
} from "@/services/career-api";

interface JobCategoryPickerProps {
  error?: string;
  onChange: (ids: string[], label: string) => void;
}

export function JobCategoryPicker({ error, onChange }: JobCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeGroupCode, setActiveGroupCode] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [query, setQuery] = useState("");
  const treeQuery = useQuery({
    queryKey: ["job-categories", "it-tree"],
    queryFn: getJobCategoryTree,
  });
  const groups = treeQuery.data ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          categories: group.categories.filter((category) =>
            [category.name, category.code, group.name]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          ),
        }))
        .filter(
          (group) => !normalizedQuery || group.categories.length > 0,
        ),
    [groups, normalizedQuery],
  );
  const activeGroup =
    visibleGroups.find((group) => group.code === activeGroupCode) ??
    visibleGroups[0] ??
    null;

  const choose = () => {
    const category = groups
      .flatMap((group) => group.categories)
      .find((item) => item.id === selectedCategoryId);
    const group = groups.find((item) =>
      item.categories.some((candidate) => candidate.id === selectedCategoryId),
    );

    if (!category || !group) return;
    const label = `${group.name} › ${category.name}`;
    setSelectedLabel(label);
    onChange([category.id], label);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Chuyên môn CNTT</Label>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 text-left font-normal",
          !selectedLabel && "text-muted-foreground",
        )}
        onClick={() => setOpen(true)}
      >
        <span className="line-clamp-2">
          {selectedLabel || "Chọn chuyên môn CNTT"}
        </span>
        <ChevronDown className="size-4 shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[86vh] gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
          <DialogHeader className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Chọn chuyên môn CNTT</DialogTitle>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm Backend, Network, Automation QA..."
                className="pl-9"
              />
            </div>
          </DialogHeader>

          <div className="grid min-h-[420px] grid-cols-[260px_minmax(280px,1fr)] overflow-hidden">
            <section className="border-r">
              <ColumnHeader>Nhóm chuyên môn</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {visibleGroups.map((group) => (
                  <button
                    key={group.code}
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                      activeGroup?.code === group.code && "bg-muted font-medium",
                    )}
                    onClick={() => setActiveGroupCode(group.code)}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <ColumnHeader>Chuyên môn</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-3">
                {treeQuery.isLoading ? <EmptyText>Đang tải...</EmptyText> : null}
                {!treeQuery.isLoading && !activeGroup ? (
                  <EmptyText>Không tìm thấy chuyên môn.</EmptyText>
                ) : null}
                {activeGroup?.categories.map((category) => (
                  <CategoryOption
                    key={category.id}
                    category={category}
                    selected={selectedCategoryId === category.id}
                    onSelect={() => setSelectedCategoryId(category.id)}
                  />
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="items-center justify-end gap-2 border-t p-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="button" disabled={!selectedCategoryId} onClick={choose}>Chọn</Button>
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
