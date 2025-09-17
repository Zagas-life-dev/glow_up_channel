import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOption {
  id: string
  label: string
  value: string | boolean
  group: string
}

interface FilterMenuProps {
  options: FilterOption[]
  selectedFilters: Set<string>
  onFilterChange: (filterId: string) => void
  onClearFilters: () => void
}

export function FilterMenu({ 
  options, 
  selectedFilters, 
  onFilterChange, 
  onClearFilters 
}: FilterMenuProps) {
  // Group options by their group property
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.group]) {
      acc[option.group] = [];
    }
    acc[option.group].push(option);
    return acc;
  }, {} as Record<string, FilterOption[]>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {selectedFilters.size > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedFilters.size}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          {selectedFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <div key={group} className="mb-4 last:mb-0">
              <h4 className="mb-2 text-sm font-medium">{group}</h4>
              <div className="space-y-2">
                {groupOptions.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm",
                      selectedFilters.has(option.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedFilters.has(option.id)}
                      onChange={() => onFilterChange(option.id)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SelectedFilters({ 
  selectedFilters, 
  options, 
  onFilterChange 
}: {
  selectedFilters: Set<string>
  options: FilterOption[]
  onFilterChange: (filterId: string) => void
}) {
  if (selectedFilters.size === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Array.from(selectedFilters).map(filterId => {
        const option = options.find(opt => opt.id === filterId);
        if (!option) return null;
        
        return (
          <Badge
            key={filterId}
            variant="secondary"
            className="px-3 py-1 flex items-center gap-1"
          >
            {option.label}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => onFilterChange(filterId)}
            />
          </Badge>
        );
      })}
    </div>
  );
}