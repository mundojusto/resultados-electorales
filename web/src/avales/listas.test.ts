import { describe, expect, it } from "vitest";

import { PROVINCIAS_AVALES } from "./avales";
import {
  CALENDARIO_DETALLADO,
  SEMANAS,
  diaDesdeBoe,
  escenariosPersonas,
  estadoEvento,
  fechaEvento,
  personasMinimo,
  personasRecomendado,
  porComunidad,
  proximoPlazo,
  totalesPersonas,
} from "./listas";

const prov = (nombre: string) => PROVINCIAS_AVALES.find((p) => p.provincia === nombre)!;

describe("personas necesarias en las listas", () => {
  it("cuadra con las tablas del documento de la Comisión", () => {
    expect(personasMinimo(prov("Madrid"))).toBe(43);
    expect(personasMinimo(prov("Barcelona"))).toBe(38);
    expect(personasMinimo(prov("Valencia"))).toBe(22);
    expect(personasMinimo(prov("Soria"))).toBe(8);
    expect(personasMinimo(prov("S. C. de Tenerife"))).toBe(17);
    expect(personasMinimo(prov("Ceuta"))).toBe(3);
    expect(personasRecomendado(prov("Ceuta"))).toBe(5);
  });

  it("los totales nacionales son 662 y 766 personas", () => {
    const t = totalesPersonas(PROVINCIAS_AVALES);
    expect(t).toMatchObject({ provincias: 52, congreso: 350, senado: 156, minimo: 662, recomendado: 766 });
  });

  it("los escenarios por censo coinciden con el resumen nacional", () => {
    const e = escenariosPersonas(PROVINCIAS_AVALES).map((x) => [x.minimo, x.recomendado]);
    expect(e).toEqual([
      [421, 501],
      [448, 532],
      [566, 646],
      [585, 669],
      [662, 766],
    ]);
  });

  it("agrupa por comunidad con los subtotales del documento", () => {
    const g = new Map(porComunidad(PROVINCIAS_AVALES).map((c) => [c.comunidad, c]));
    expect(g.get("Andalucía")).toMatchObject({ minimo: 109, recomendado: 125 });
    expect(g.get("Castilla y León")).toMatchObject({ minimo: 85, recomendado: 103 });
    expect(g.get("Canarias")).toMatchObject({ minimo: 33, recomendado: 37 });
  });
});

describe("calendario", () => {
  it("numera los días desde la publicación en el BOE", () => {
    expect(diaDesdeBoe({ desde: "2026-10-04", hasta: "2026-10-05" })).toBe("Víspera");
    expect(diaDesdeBoe({ desde: "2026-10-06" })).toBe("Día 0");
    expect(diaDesdeBoe({ desde: "2026-10-21", hasta: "2026-10-26" })).toBe("Días 15 a 20");
    expect(diaDesdeBoe({ desde: "2026-11-29" })).toBe("Día 54");
  });

  it("escribe las fechas con el día de la semana", () => {
    expect(fechaEvento({ desde: "2026-10-06" })).toBe("mar 6 oct");
    expect(fechaEvento({ desde: "2026-10-21", hasta: "2026-10-26" })).toBe("mié 21 – lun 26 oct");
    expect(fechaEvento({ desde: "2026-10-28", hasta: "2026-11-02" })).toBe("mié 28 oct – lun 2 nov");
  });

  it("marca un tramo como de hoy mientras dura", () => {
    const e = { desde: "2026-10-21", hasta: "2026-10-26" };
    expect(estadoEvento(e, "2026-10-20")).toBe("futuro");
    expect(estadoEvento(e, "2026-10-23")).toBe("hoy");
    expect(estadoEvento(e, "2026-10-27")).toBe("pasado");
  });

  it("el próximo plazo es el siguiente clave o interno que no ha vencido", () => {
    expect(proximoPlazo("2026-10-04")?.vence).toBe("2026-10-06");
    expect(proximoPlazo("2026-10-07")).toMatchObject({ vence: "2026-10-09", dias: 2 });
    expect(proximoPlazo("2026-10-09")).toMatchObject({ vence: "2026-10-09", dias: 0 });
    expect(proximoPlazo("2026-12-08")).toBeNull();
  });

  it("todas las fechas son válidas y los tramos no van al revés", () => {
    for (const e of CALENDARIO_DETALLADO) {
      expect(e.desde).toMatch(/^2026-\d\d-\d\d$/);
      if (e.hasta) expect(e.hasta >= e.desde).toBe(true);
    }
  });

  it("las tareas tienen identificadores únicos (se guardan en el navegador)", () => {
    const ids = SEMANAS.flatMap((s) => s.tareas.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
