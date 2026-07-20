import type { WorkflowCondition } from "./events";

/** Remplace {{champ}} par la valeur correspondante du payload. */
export function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Vrai si toutes les conditions (égalité stricte) sont satisfaites par le payload. */
export function matchesConditions(
  conditions: WorkflowCondition[] | undefined,
  payload: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => payload[c.field] === c.equals);
}
