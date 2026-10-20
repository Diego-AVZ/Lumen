export type VisitState = {
  choices: Record<string, number>;
  secrets: Record<string, boolean>;
  gate: boolean;
};

const empty = (): VisitState => ({ choices: {}, secrets: {}, gate: false });

function key(universeId: string) {
  return `lumen.visit.v1.${universeId}`;
}

export function readVisit(universeId: string): VisitState {
  try {
    const raw = localStorage.getItem(key(universeId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<VisitState>;
    return {
      choices: parsed.choices ?? {},
      secrets: parsed.secrets ?? {},
      gate: Boolean(parsed.gate),
    };
  } catch {
    return empty();
  }
}

export function writeVisit(universeId: string, next: VisitState) {
  try {
    localStorage.setItem(key(universeId), JSON.stringify(next));
  } catch {
    /* modo privado */
  }
}
