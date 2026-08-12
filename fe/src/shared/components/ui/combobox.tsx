"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

export interface ComboboxOption {
  value: string | number;
  label: string;
  isOwner?: boolean;
  disabled?: boolean;
}

interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchValue?: string;
  onSearchValueChange?: (val: string) => void;
  shouldFilter?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  showSearch?: boolean;
  selectedLabel?: React.ReactNode;
  contentAfter?: React.ReactNode;
}

interface MultiComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  selectedLabel?: (selected: ComboboxOption[]) => React.ReactNode;
  clearLabel?: string;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No item found.",
  className,
  disabled = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  searchValue,
  onSearchValueChange,
  shouldFilter,
  triggerClassName,
  contentClassName,
  showSearch = true,
  selectedLabel,
  contentAfter,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen =
    controlledOnOpenChange !== undefined
      ? controlledOnOpenChange
      : setInternalOpen;
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full min-w-0 shrink justify-between gap-1.5 rounded-xl border border-border bg-background px-3 text-sm transition-[color,box-shadow,background-color] outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-expanded:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              triggerClassName,
            )}
          >
            {selectedOption || selectedLabel ? (
              <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
                {selectedOption?.isOwner && (
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                <span className="min-w-0 max-w-full truncate">
                  {selectedOption?.label ?? selectedLabel}
                </span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                {placeholder}
              </span>
            )}
            <ChevronsUpDownIcon
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-(--radix-popper-anchor-width) max-w-[min(100vw-1.5rem,var(--radix-popover-content-available-width,100vw))] rounded-xl bg-popover p-1 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10",
            contentClassName,
          )}
          align="start"
          onWheel={(e: React.WheelEvent) => e.stopPropagation()}
        >
          <Command
            shouldFilter={shouldFilter}
            onWheel={(e: React.WheelEvent) => e.stopPropagation()}
            filter={
              shouldFilter !== false
                ? (value: string, search: string) => {
                    const trimmedSearch = normalizeSearch(search.trim());
                    if (normalizeSearch(value).includes(trimmedSearch))
                      return 1;
                    return 0;
                  }
                : undefined
            }
            value={
              selectedOption
                ? `${selectedOption.label}-${selectedOption.value}`
                : undefined
            }
            className="bg-transparent p-0"
          >
            {showSearch && (
              <CommandInput
                placeholder={searchPlaceholder}
                value={searchValue}
                onValueChange={onSearchValueChange}
              />
            )}
            <CommandList
              className="max-h-60 overflow-y-auto"
              onWheel={(e: React.WheelEvent) => e.stopPropagation()}
            >
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label}-${option.value}`}
                    disabled={option.disabled}
                    onSelect={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {option.isOwner && (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {contentAfter}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MultiCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No item found.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  selectedLabel,
  clearLabel = "Clear selection",
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );

  const toggleValue = (optionValue: string | number) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              "h-9 w-full min-w-0 shrink justify-between gap-1.5 rounded-xl border border-border bg-background px-3 text-sm transition-[color,box-shadow,background-color] outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-expanded:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              triggerClassName,
            )}
          >
            {selectedOptions.length > 0 ? (
              <span className="min-w-0 flex-1 truncate text-left">
                {selectedLabel
                  ? selectedLabel(selectedOptions)
                  : selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : `${selectedOptions.length} items selected`}
              </span>
            ) : (
              <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                {placeholder}
              </span>
            )}
            <ChevronsUpDownIcon
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-(--radix-popper-anchor-width) max-w-[min(100vw-1.5rem,var(--radix-popover-content-available-width,100vw))] rounded-xl bg-popover p-1 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10",
            contentClassName,
          )}
          align="start"
          onWheel={(event: React.WheelEvent) => event.stopPropagation()}
        >
          <Command
            filter={(optionValue: string, search: string) =>
              normalizeSearch(optionValue).includes(
                normalizeSearch(search.trim()),
              )
                ? 1
                : 0
            }
            className="bg-transparent p-0"
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList
              className="max-h-60 overflow-y-auto"
              aria-multiselectable="true"
              onWheel={(event: React.WheelEvent) => event.stopPropagation()}
            >
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value);

                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label}-${option.value}`}
                      disabled={option.disabled}
                      aria-selected={isSelected}
                      onSelect={() => {
                        if (!option.disabled) toggleValue(option.value);
                      }}
                      className={cn(
                        "flex items-center gap-2",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      <CheckIcon
                        className={cn(
                          "ml-auto size-4",
                          !isSelected && "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {value.length > 0 ? (
            <div className="border-t p-1 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onChange([])}
              >
                {clearLabel}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default Combobox;
