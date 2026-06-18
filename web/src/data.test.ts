import { describe, expect, it } from "vitest";

import {
  agregarPorComunidad,
  agregarPorProvincia,
  municipiosDeProvincia,
  porcentaje,
  provinciaAComunidad,
  valoresPorProvincia,
} from "./data";
import type { RegistroMunicipio } from "./types";

// Conjunto de registros de prueba: 2 CCAA, 3 provincias, 4 municipios.
function reg(p: Partial<RegistroMunicipio>): RegistroMunicipio {
  return {
    comunidad: "Andalucía",
    codigo_provincia: 4,
    provincia: "Almería",
    codigo_municipio: 1,
    municipio: "Abla",
    codigo_ine: "04001",
    censo: 1000,
    votantes: 800,
    votos_validos: 700,
    votos_candidaturas: 690,
    votos_partido: 10,
    ...p,
  };
}

const registros: RegistroMunicipio[] = [
  reg({ comunidad: "Andalucía", codigo_provincia: 4, provincia: "Almería",
        codigo_ine: "04001", municipio: "Abla", votos_partido: 10, votos_validos: 700 }),
  reg({ comunidad: "Andalucía", codigo_provincia: 4, provincia: "Almería",
        codigo_ine: "04003", municipio: "Adra", votos_partido: 30, votos_validos: 300 }),
  reg({ comunidad: "Andalucía", codigo_provincia: 11, provincia: "Cádiz",
        codigo_ine: "11001", municipio: "Alcalá", votos_partido: 5, votos_validos: 500 }),
  reg({ comunidad: "Madrid", codigo_provincia: 28, provincia: "Madrid",
        codigo_ine: "28079", municipio: "Madrid", votos_partido: 100, votos_validos: 1000 }),
];

describe("porcentaje", () => {
  it("calcula el porcentaje", () => {
    expect(porcentaje(10, 200)).toBe(5);
  });

  it("devuelve 0 si los válidos son 0", () => {
    expect(porcentaje(10, 0)).toBe(0);
  });
});

describe("agregarPorComunidad", () => {
  const filas = agregarPorComunidad(registros);

  it("agrupa por comunidad", () => {
    expect(filas).toHaveLength(2);
  });

  it("suma votos y válidos por comunidad", () => {
    const and = filas.find((f) => f.id === "Andalucía")!;
    expect(and.votos_partido).toBe(45); // 10 + 30 + 5
    expect(and.votos_validos).toBe(1500); // 700 + 300 + 500
    expect(and.porcentaje).toBe(porcentaje(45, 1500));
  });

  it("ordena de mayor a menor por votos", () => {
    expect(filas[0].id).toBe("Madrid"); // 100 > 45
  });
});

describe("agregarPorProvincia", () => {
  it("agrupa por provincia con código a 2 dígitos", () => {
    const filas = agregarPorProvincia(registros);
    expect(filas).toHaveLength(3);
    const almeria = filas.find((f) => f.id === "04")!;
    expect(almeria.votos_partido).toBe(40); // 10 + 30
    expect(almeria.codigo_provincia).toBe(4);
  });

  it("filtra por comunidad cuando se indica", () => {
    const filas = agregarPorProvincia(registros, "Madrid");
    expect(filas).toHaveLength(1);
    expect(filas[0].id).toBe("28");
  });
});

describe("municipiosDeProvincia", () => {
  it("devuelve solo los municipios de la provincia indicada, ordenados", () => {
    const filas = municipiosDeProvincia(registros, 4);
    expect(filas.map((f) => f.nombre)).toEqual(["Adra", "Abla"]); // 30 > 10
  });
});

describe("valoresPorProvincia", () => {
  it("indexa por código de provincia (2 díg.)", () => {
    const mapa = valoresPorProvincia(registros);
    expect(mapa.get("04")?.votos_partido).toBe(40);
    expect(mapa.get("28")?.votos_partido).toBe(100);
  });
});

describe("provinciaAComunidad", () => {
  it("mapea código de provincia a su comunidad", () => {
    const mapa = provinciaAComunidad(registros);
    expect(mapa.get("04")).toBe("Andalucía");
    expect(mapa.get("28")).toBe("Madrid");
  });
});
