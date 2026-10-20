const EMOJIS = ['✨', '🌙', '☕', '🎬', '🎶', '🌿', '⭐', '😄', '😉', '🐶', '🐻', '🍕'];

export function EmojiBar({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-0.5">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(emoji)}
          className="grid h-7 w-7 place-items-center rounded-full text-[15px] text-inkwell/80 hover:bg-white"
          aria-label={`Añadir ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function insertEmoji(value: string, emoji: string, el?: HTMLInputElement | HTMLTextAreaElement | null) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  const caret = start + emoji.length;
  window.requestAnimationFrame(() => {
    el?.focus();
    el?.setSelectionRange(caret, caret);
  });
  return next;
}
