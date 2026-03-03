"use client";

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  max = 5,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const sizes = { sm: "w-5 h-5", md: "w-7 h-7", lg: "w-9 h-9" };

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${sizes[size]} ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= value ? "#f59e0b" : "none"}
            stroke={star <= value ? "#f59e0b" : "#d1d5db"}
            strokeWidth={1.5}
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
