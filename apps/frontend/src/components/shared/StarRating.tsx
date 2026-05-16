import { Star } from "lucide-react";
import clsx from "clsx";

interface StarRatingProps {
  value: number;
  count?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: number;
}

export default function StarRating({
  value,
  count,
  interactive = false,
  onChange,
  size = 14,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onChange?.(star)}
            disabled={!interactive}
            className={clsx(
              "transition-transform",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default"
            )}
          >
            <Star
              size={size}
              className={clsx(
                star <= Math.round(value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-slate-600"
              )}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-xs text-muted">
          {value.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}
