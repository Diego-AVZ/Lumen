export type AttachKind = 'cita' | 'viaje';

/** Un proyecto ya publicado, usado dentro de otro. Cada uno se paga al publicarse. */
export type Attachment = {
  kind: AttachKind;
  id: string;
  slug: string;
  title: string;
};

export function parseAttachment(value: unknown, kind: AttachKind): Attachment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Attachment>;
  if (raw.kind && raw.kind !== kind) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  if (!id && !slug) return null;
  return {
    kind,
    id,
    slug,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
  };
}
