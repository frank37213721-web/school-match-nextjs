/**
 * Shared "is this course still seeking partner schools" logic, used by both
 * the public lobby (to sort courses into 尋求合作中／已找到合作 tabs) and the
 * applyForMatch Server Action (to reject applications the lobby shouldn't
 * have offered in the first place).
 */

export function isPastDeadline(applicationDeadline: string | null): boolean {
  if (!applicationDeadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > applicationDeadline;
}

export function countFilledPartnerNotes(partnerNotes: string[]): number {
  return partnerNotes.filter((note) => note.trim().length > 0).length;
}

export function computeCourseSeekingStatus(course: {
  maxSchools: number;
  approvedCount: number;
  pendingCount: number;
  partnerNotes: string[];
  closedToMatching: boolean;
  applicationDeadline: string | null;
}): { isFull: boolean; isSeeking: boolean } {
  const filled = course.approvedCount + course.pendingCount + countFilledPartnerNotes(course.partnerNotes);
  const isFull = filled >= course.maxSchools;
  const isSeeking = !course.closedToMatching && !isFull && !isPastDeadline(course.applicationDeadline);
  return { isFull, isSeeking };
}
