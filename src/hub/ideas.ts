import { uid } from '@/lib/motion';

const KEY = 'lumen.ideas.v1';

export type IdeaNote = {
  id: string;
  text: string;
  createdAt: string;
};

export function listIdeas(): IdeaNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IdeaNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIdeas(rows: IdeaNote[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function addIdea(text: string): IdeaNote {
  const note: IdeaNote = { id: uid('idea'), text: text.trim(), createdAt: new Date().toISOString() };
  saveIdeas([note, ...listIdeas()]);
  return note;
}

export function removeIdea(id: string) {
  saveIdeas(listIdeas().filter((row) => row.id !== id));
}
