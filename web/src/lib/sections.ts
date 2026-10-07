export type SectionType = "BOTH" | "MEN_ONLY" | "WOMEN_ONLY";

export const SECTION_LABEL: Record<SectionType, string> = {
  BOTH: "قسمين",
  MEN_ONLY: "رجال فقط",
  WOMEN_ONLY: "نساء فقط",
};

// حجزان في القاعة واليوم نفسه يتعارضان إذا تشاركا قسماً واحداً على الأقل
export function sectionsConflict(a: SectionType, b: SectionType): boolean {
  if (a === "BOTH" || b === "BOTH") return true;
  return a === b;
}
