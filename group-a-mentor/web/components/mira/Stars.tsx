import { Star } from "lucide-react";

interface StarsProps {
  rating: number | null;
  count?: number;
  classes?: number;
}

export function Stars({ rating, count, classes }: StarsProps) {
  if (rating === null || rating === undefined) return null;
  return (
    <span className="inline-flex items-center gap-2.5 text-[13px] text-charcoal">
      <span className="inline-flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-gold text-gold" strokeWidth={0} />
        <span className="font-semibold">{Number(rating).toFixed(1)}</span>
        {count !== undefined && (
          <span className="font-medium text-muted-foreground">({count})</span>
        )}
      </span>
      {classes !== undefined && (
        <>
          <span className="h-0.5 w-0.5 rounded-full bg-muted-soft" aria-hidden />
          <span className="text-muted-foreground">{classes} classes</span>
        </>
      )}
    </span>
  );
}
