import { describe, expect, it } from "vitest";

import {
  CALENDARIO,
  PROVINCIAS_AVALES,
  escenarios,
  minimoLegal,
  momento,
  objetivo,
  totales,
  tramo,
  type ProvinciaAvales,
} from "./avales";

describe("cálculo de avales", () => {
  it("el mínimo legal es el 0,1 % del censo redondeado al alza", () => {
    expect(minimoLegal(516_053)).toBe(517);
    expect(minimoLegal(5_252_654)).toBe(5_253);
    expect(minimoLegal(77_000)).toBe(77);
  });

  it("los objetivos suben el mínimo un 20 % y un 30 %, al alza", () => {
    expect(objetivo(516_053, 0.2)).toBe(621);
    expect(objetivo(516_053, 0.3)).toBe(673);
    // 5 × 1,2 = 6 exacto: no debe convertirse en 7 por error de coma flotante.
    expect(objetivo(5_000, 0.2)).toBe(6);
  });

  it("los totales de las 52 provincias cuadran con el documento de la Comisión", () => {
    const t = totales(PROVINCIAS_AVALES);
    expect(t.provincias).toBe(52);
    expect(t.censo).toBe(37_353_488);
    expect(t.minimo).toBe(37_380);
    expect(t.objetivo20).toBe(44_879);
    expect(t.objetivo30).toBe(48_618);
    expect(t.congreso).toBe(350);
    expect(t.senado).toBe(156);
  });

  it("cada provincia tiene un código INE único de dos dígitos", () => {
    const codigos = PROVINCIAS_AVALES.map((p) => p.codigo);
    expect(new Set(codigos).size).toBe(52);
    for (const c of codigos) expect(c).toMatch(/^\d{2}$/);
  });

  it("los escenarios de 40 y 42 provincias usan las de menor y mayor censo", () => {
    const e = escenarios(PROVINCIAS_AVALES);
    expect(e.map((x) => x.minimo)).toEqual([15_797, 17_632, 35_719, 36_170, 37_380]);
    expect(e[4].objetivo30).toBe(48_618);
    expect(e[4].porDia).toBe(3_241);
  });

  it("añade el escenario real cuando la Coordinadora marca provincias", () => {
    const ps: ProvinciaAvales[] = PROVINCIAS_AVALES.map((p) => ({
      ...p,
      seleccionada: p.codigo === "28" || p.codigo === "42",
    }));
    const [primero] = escenarios(ps);
    expect(primero.etiqueta).toBe("Provincias elegidas (2)");
    expect(primero.minimo).toBe(5_253 + 78);
  });
});

describe("calendario", () => {
  it("antes del 6 de octubre cuenta los días que faltan", () => {
    expect(momento("2026-10-03")).toEqual({ tipo: "antes", dias: 3 });
  });

  it("durante la recogida da el día y lo que queda hasta el 26", () => {
    expect(momento("2026-10-06")).toEqual({ tipo: "recogida", dia: 1, quedan: 20 });
    expect(momento("2026-10-26")).toEqual({ tipo: "recogida", dia: 21, quedan: 0 });
  });

  it("después del 26 la recogida está cerrada", () => {
    expect(momento("2026-10-27")).toEqual({ tipo: "cerrada" });
  });

  it("formatea los tramos de fechas", () => {
    expect(CALENDARIO.map(tramo)).toEqual([
      "6–11 oct",
      "12–18 oct",
      "19–20 oct",
      "21–23 oct",
      "24–25 oct",
      "26 oct",
      "28 oct – 2 nov",
    ]);
  });
});
