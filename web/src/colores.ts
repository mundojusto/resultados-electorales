import type { FilaAgregada, Metrica } from "./types";

const COLOR_BASE = [248, 233, 218]; // crema muy claro (tinte del beige M+J)
const COLOR_FUERTE = [154, 83, 57]; // terracota M+J (Pantone 7592 C, #9A5339)

/** Interpola entre el crema claro y la terracota M+J según t ∈ [0, 1]. */
export function interpolaColor(t: number): string {
  const c = COLOR_BASE.map((b, i) =>
    Math.round(b + (COLOR_FUERTE[i] - b) * Math.max(0, Math.min(1, t))),
  );
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function valorDe(f: FilaAgregada | undefined, metrica: Metrica): number {
  if (!f) return 0;
  return metrica === "votos" ? f.votos_partido : f.porcentaje;
}

export function maxValor(valores: Iterable<FilaAgregada>, metrica: Metrica): number {
  let m = 0;
  for (const f of valores) m = Math.max(m, valorDe(f, metrica));
  return m || 1;
}

/** Escala sqrt: realza los valores bajos, habituales en un partido pequeño. */
export function colorPara(
  fila: FilaAgregada | undefined,
  metrica: Metrica,
  max: number,
): string {
  return interpolaColor(Math.sqrt(valorDe(fila, metrica) / max));
}
