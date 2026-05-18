"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FilePickFieldProps {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  chooseLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function FilePickField({
  id,
  label,
  accept,
  file,
  onFileChange,
  chooseLabel = "Choose file",
  disabled,
  className,
}: FilePickFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  function clearFile() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus />
          {chooseLabel}
        </Button>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            file ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {file ? file.name : "No file selected"}
        </span>
        {file && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={disabled}
            onClick={clearFile}
            aria-label={`Remove ${label}`}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
