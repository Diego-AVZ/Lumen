type HapticStyle = 'light' | 'medium' | 'success';

export function haptic(style: HapticStyle = 'light') {
  try {
    const pattern = style === 'success' ? [10, 28, 16] : style === 'medium' ? 16 : 8;
    navigator.vibrate?.(pattern);
  } catch {
    /* el toque sigue existiendo aunque el móvil ignore la vibración */
  }
}
