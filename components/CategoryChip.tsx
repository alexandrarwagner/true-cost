import { copy } from "@/content/copy";
import type { Category } from "@/lib/core/types";

/** Cost colours always mean the same cost, everywhere; the name is always printed with them. */
export const CATEGORY_BG: Record<Category, string> = {
  tuition: "bg-cat-tuition-chip",
  housing: "bg-cat-housing",
  health_insurance: "bg-cat-insurance",
  living: "bg-cat-living",
  one_off: "bg-cat-oneoff",
  money_moving: "bg-cat-moving",
};

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span
      className={`inline-block rounded-pill px-2.5 py-0.5 text-sm font-semibold text-ink ${CATEGORY_BG[category]}`}
    >
      {copy.categories[category]}
    </span>
  );
}
