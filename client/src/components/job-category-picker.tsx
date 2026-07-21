import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getJobCategoryTree,
  searchJobCategories,
  type JobCategoryNode,
} from "@/services/career-api";
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

interface JobCategoryPickerProps {
  error?: string;
  onChange: (ids: number[], label: string) => void;
}

export function JobCategoryPicker({ error, onChange }: JobCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const [activeSecondId, setActiveSecondId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedLabel, setSelectedLabel] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const treeQuery = useQuery({
    queryKey: ["job-categories", "tree"],
    queryFn: getJobCategoryTree,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["job-categories", "search", debouncedQuery],
    queryFn: () => searchJobCategories(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const searchIds = useMemo(() => {
    if (debouncedQuery.length < 2) {
      return null;
    }

    return new Set(
      (searchQuery.data ?? []).flatMap((item) => [
        item.id,
        ...item.descendant_ids,
      ]),
    );
  }, [debouncedQuery.length, searchQuery.data]);

  const roots = treeQuery.data ?? [];
  const visibleRoots = useMemo(
    () => filterNodesBySearch(roots, searchIds),
    [roots, searchIds],
  );
  const activeRoot = useMemo(
    () =>
      visibleRoots.find((root) => root.id === activeRootId) ??
      visibleRoots[0] ??
      null,
    [activeRootId, visibleRoots],
  );
  const secondLevelCategories = useMemo(
    () => filterNodesBySearch(activeRoot?.children ?? [], searchIds),
    [activeRoot?.children, searchIds],
  );
  const activeSecond =
    secondLevelCategories.find((category) => category.id === activeSecondId) ??
    secondLevelCategories[0] ??
    null;
  const thirdLevelCategories = activeSecond?.children ?? [];

  useEffect(() => {
    if (!activeRootId && visibleRoots[0]) {
      setActiveRootId(visibleRoots[0].id);
    }
  }, [activeRootId, visibleRoots]);

  useEffect(() => {
    if (debouncedQuery.length < 2 || searchQuery.isFetching) {
      return;
    }

    const firstRoot = visibleRoots[0] ?? null;
    const currentRootVisible = visibleRoots.some(
      (root) => root.id === activeRootId,
    );

    if (firstRoot && !currentRootVisible) {
      setActiveRootId(firstRoot.id);
      setActiveSecondId(
        filterNodesBySearch(firstRoot.children, searchIds)[0]?.id ?? null,
      );
    }
  }, [
    activeRootId,
    debouncedQuery.length,
    searchIds,
    searchQuery.isFetching,
    visibleRoots,
  ]);

  useEffect(() => {
    const currentSecondVisible = secondLevelCategories.some(
      (category) => category.id === activeSecondId,
    );

    if ((!activeSecond || !currentSecondVisible) && secondLevelCategories[0]) {
      setActiveSecondId(secondLevelCategories[0].id);
    }
  }, [activeSecond, activeSecondId, secondLevelCategories]);

  const hasSelectedCategory = Boolean(selectedCategoryId);

  const handleRootClick = (root: JobCategoryNode) => {
    setActiveRootId(root.id);
    setActiveSecondId(root.children[0]?.id ?? null);
    setSelectedCategoryId(null);
  };

  const handleSecondClick = (category: JobCategoryNode) => {
    setActiveSecondId(category.id);
    setSelectedCategoryId(category.children.length === 0 ? category.id : null);
  };

  const handleLeafSelect = (category: JobCategoryNode) => {
    setSelectedCategoryId(category.id);
  };

  const handleChoose = () => {
    const selectedIds = selectedCategoryId ? [selectedCategoryId] : [];
    const label = buildSelectedLabel(roots, selectedCategoryId);

    setSelectedLabel(label);
    onChange(selectedIds, label);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Job category</Label>
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
          {selectedLabel || "Choose job group, category, or specialization"}
        </span>
        <ChevronDown className="size-4 shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[86vh] gap-0 overflow-hidden p-0 sm:max-w-5xl"
          showCloseButton={false}
        >
          <DialogHeader className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Choose job category</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search category, e.g. frontend, tester, sales..."
                className="pl-9"
              />
            </div>
          </DialogHeader>

          <div className="grid min-h-[420px] grid-cols-[280px_minmax(260px,0.85fr)_minmax(320px,1fr)] overflow-hidden">
            <section className="border-r">
              <ColumnHeader>Job groups</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {visibleRoots.map((root) => {
                  const active = root.id === activeRoot?.id;

                  return (
                    <button
                      key={root.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                        active && "bg-muted font-medium",
                      )}
                      onClick={() => handleRootClick(root)}
                    >
                      <span className="min-w-0 flex-1">{root.name}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border-r">
              <ColumnHeader>Categories</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-3">
                {treeQuery.isLoading ? (
                  <EmptyText>Loading categories...</EmptyText>
                ) : null}
                {debouncedQuery.length >= 2 && searchQuery.isFetching ? (
                  <EmptyText>Searching...</EmptyText>
                ) : null}
                {!treeQuery.isLoading &&
                !searchQuery.isFetching &&
                secondLevelCategories.length === 0 ? (
                  <EmptyText>No category found.</EmptyText>
                ) : null}
                {!searchQuery.isFetching
                  ? secondLevelCategories.map((category) => {
                      const active = category.id === activeSecond?.id;

                      return (
                        <div
                          key={category.id}
                          className={cn(
                            "mb-2 rounded-md border",
                            active && "border-primary/60 bg-primary/5",
                          )}
                        >
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 px-2 py-2 text-left text-sm"
                            onClick={() => handleSecondClick(category)}
                          >
                            <span className="min-w-0 flex-1 font-medium">
                              {category.name}
                            </span>
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          </button>
                        </div>
                      );
                    })
                  : null}
              </div>
            </section>

            <section>
              <ColumnHeader>Specializations</ColumnHeader>
              <div className="max-h-[420px] overflow-y-auto p-3">
                {activeSecond ? (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{activeSecond.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Choose exactly one specialization.
                      </p>
                    </div>
                  </div>
                ) : null}
                {thirdLevelCategories.length === 0 ? (
                  <EmptyText>
                    Choose a category on the middle column first.
                  </EmptyText>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {thirdLevelCategories.map((category) => {
                      const selected = selectedCategoryId === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                          onClick={() => handleLeafSelect(category)}
                        >
                          <span
                            className={cn(
                              "flex size-3.5 items-center justify-center rounded-full border",
                              selected &&
                                "border-primary-foreground bg-primary-foreground",
                            )}
                          >
                            {selected ? (
                              <span className="size-1.5 rounded-full bg-primary" />
                            ) : null}
                          </span>
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <DialogFooter className="items-center justify-end sm:justify-end">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!hasSelectedCategory}
                onClick={handleChoose}
              >
                Choose
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ColumnHeader({ children }: { children: string }) {
  return (
    <div className="border-b px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyText({ children }: { children: string }) {
  return (
    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function filterNodesBySearch(
  nodes: JobCategoryNode[],
  searchIds: Set<number> | null,
) {
  if (!searchIds) {
    return nodes;
  }

  return nodes.filter((node) => hasSearchMatch(node, searchIds));
}

function hasSearchMatch(node: JobCategoryNode, searchIds: Set<number>): boolean {
  return (
    searchIds.has(node.id) ||
    node.children.some((child) => hasSearchMatch(child, searchIds))
  );
}

function buildSelectedLabel(
  nodes: JobCategoryNode[],
  selectedCategoryId: number | null,
) {
  if (!selectedCategoryId) {
    return "";
  }

  return (
    flattenNodes(nodes).find((node) => node.id === selectedCategoryId)?.name ??
    ""
  );
}

function flattenNodes(nodes: JobCategoryNode[]): JobCategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}
