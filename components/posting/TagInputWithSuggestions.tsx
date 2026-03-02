"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TagInputWithSuggestionsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  label?: string;
  helperText?: string;
}

export function TagInputWithSuggestions({
  tags,
  onTagsChange,
  maxTags = 10,
  label = "Tags",
  helperText = "Add up to 10 tags for better discovery",
}: TagInputWithSuggestionsProps) {
  const [tagInput, setTagInput] = React.useState("");
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = React.useState(false);
  const [isTagLoading, setIsTagLoading] = React.useState(false);
  const [tagSelectedIndex, setTagSelectedIndex] = React.useState(0);
  const tagDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const tagInputContainerRef = React.useRef<HTMLDivElement | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const handleSelectTagSuggestion = (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    if (tags.includes(cleanTag) || tags.length >= maxTags) {
      setShowTagSuggestions(false);
      return;
    }
    onTagsChange([...tags, cleanTag]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // When suggestions are visible, use keyboard to navigate/select them
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTagSelectedIndex((prev) => (prev + 1) % tagSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTagSelectedIndex(
          (prev) => (prev - 1 + tagSuggestions.length) % tagSuggestions.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = tagSuggestions[tagSelectedIndex] || tagSuggestions[0];
        if (selected) {
          handleSelectTagSuggestion(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowTagSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const cleanTag = tagInput.trim();
      if (cleanTag && !tags.includes(cleanTag) && tags.length < maxTags) {
        onTagsChange([...tags, cleanTag]);
        setTagInput("");
        setShowTagSuggestions(false);
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  // Fetch tag suggestions from the backend based on current input
  React.useEffect(() => {
    const query = tagInput.trim();

    if (!query) {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      setIsTagLoading(false);
      if (tagDebounceRef.current) {
        clearTimeout(tagDebounceRef.current);
      }
      return;
    }

    if (tagDebounceRef.current) {
      clearTimeout(tagDebounceRef.current);
    }

    tagDebounceRef.current = setTimeout(async () => {
      try {
        setIsTagLoading(true);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Use existing hashtag + skills suggestion endpoints as tag source
        const [hashtagResponse, skillsResponse] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/hashtags/suggestions?q=${encodeURIComponent(
              query
            )}`,
            { headers }
          ).catch(() => null),
          fetch(
            `${API_BASE_URL}/api/skills/suggestions?q=${encodeURIComponent(
              query
            )}`,
            { headers }
          ).catch(() => null),
        ]);

        let hashtagSuggestions: string[] = [];
        if (hashtagResponse && hashtagResponse.ok) {
          const hashtagData = await hashtagResponse.json();
          if (hashtagData?.success && Array.isArray(hashtagData.suggestions)) {
            hashtagSuggestions = hashtagData.suggestions;
          }
        }

        let skillSuggestions: string[] = [];
        if (skillsResponse && skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          if (skillsData?.success && Array.isArray(skillsData.suggestions)) {
            skillSuggestions = skillsData.suggestions;
          }
        }

        const allSuggestions = new Set<string>([
          ...hashtagSuggestions,
          ...skillSuggestions,
        ]);

        const combined = Array.from(allSuggestions)
          .map((s) => s.trim())
          .filter((s) => {
            if (!s) return false;
            const normalized = s.toLowerCase();
            return (
              normalized.includes(query.toLowerCase()) && !tags.includes(s)
            );
          })
          .slice(0, 8);

        setTagSuggestions(combined);
        setShowTagSuggestions(combined.length > 0);
        setTagSelectedIndex(0);
      } catch (err) {
        console.error("Failed to fetch tag suggestions", err);
        setTagSuggestions([]);
        setShowTagSuggestions(false);
      } finally {
        setIsTagLoading(false);
      }
    }, 300);

    return () => {
      if (tagDebounceRef.current) {
        clearTimeout(tagDebounceRef.current);
      }
    };
  }, [tagInput, API_BASE_URL, tags]);

  return (
    <div className="space-y-3">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-foreground"
            >
              <span className="sr-only">Remove tag</span>
              ×
            </button>
          </span>
        ))}
      </div>
      <div ref={tagInputContainerRef} className="relative">
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Type to search tags (press Enter to add)"
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-xl"
        />
        {showTagSuggestions && (isTagLoading || tagSuggestions.length > 0) && (
          <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card/90 backdrop-blur-sm shadow-md shadow-black/20">
            {isTagLoading && tagSuggestions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Searching tags...
              </div>
            )}
            {tagSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectTagSuggestion(suggestion);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/10 focus:bg-white/10 focus:outline-none rounded-lg",
                  index === tagSelectedIndex && "bg-white/10"
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

export default TagInputWithSuggestions;

