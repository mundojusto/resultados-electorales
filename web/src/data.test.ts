import { describe, expect, it } from "vitest";

import {
  TODAS_COMUNIDADES,
  agregarPorComunidad,
  agregarPorProvincia,
  comunidadesHistorico,
  etiquetaPeriodo,
  municipiosDeProvincia,
  porcentaje,
  provinciaAComunidad,
  serieHistorica,
  tiposHistorico,
  valoresPorProvincia,
} from "./data";
import { normalizarComunidad } from "./comunidades";
import type { AgregadoProvincia, Historico, RegistroMunicipio } from "./types";

// Registros municipales de prueba (solo municipios con votos): 1 provincia.
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
  reg({ codigo_ine: "04001", municipio: "Abla", votos_partido: 10, votos_validos: 700 }),
  reg({ codigo_ine: "04003", municipio: "Adra", votos_partido: 30, votos_validos: 300 }),
];

// Agregado por provincia de prueba: 2 CCAA, 3 provincias.
function prov(p: Partial<AgregadoProvincia>): AgregadoProvincia {
  return {
    codigo_provincia: 4,
    provincia: "Almería",
    comunidad: "Andalucía",
    votos_partido: 0,
    votos_validos: 0,
    votos_candidaturas: 0,
    municipios: 1,
    ...p,
  };
}

const provincias: AgregadoProvincia[] = [
  prov({ codigo_provincia: 4, provincia: "Almería", comunidad: "Andalucía",
         votos_partido: 40, votos_validos: 1000, municipios: 2 }),
  prov({ codigo_provincia: 11, provincia: "Cádiz", comunidad: "Andalucía",
         votos_partido: 5, votos_validos: 500, municipios: 1 }),
  prov({ codigo_provincia: 28, provincia: "Madrid", comunidad: "Madrid",
         votos_partido: 100, votos_validos: 1000, municipios: 1 }),
];

describe("porcentaje", () => {
  it("calcula el porcentaje", () => {
    expect(porcentaje(10, 200)).toBe(5);
  });

  it("devuelve 0 si los válidos son 0", () => {
    expect(porcentaje(10, 0)).toBe(0);
  });
});

describe("normalizarComunidad", () => {
  it("recorta espacios de relleno", () => {
    expect(normalizarComunidad("Andalucía          ")).toBe("Andalucía");
  });

  it("resuelve variantes de orden y prefijo a un nombre canónico", () => {
    expect(normalizarComunidad("Madrid, Comunidad de")).toBe("Comunidad de Madrid");
    expect(normalizarComunidad("Ciudad de Ceuta")).toBe("Ceuta");
    expect(normalizarComunidad("Rioja, La")).toBe("La Rioja");
  });

  it("unifica variantes lingüísticas", () => {
    expect(normalizarComunidad("Catalunya")).toBe("Cataluña");
    expect(normalizarComunidad("Cataluña")).toBe("Cataluña");
  });

  it("devuelve el nombre limpio si no hay alias", () => {
    expect(normalizarComunidad("Galicia")).toBe("Galicia");
    expect(normalizarComunidad(null)).toBe("");
  });
});

describe("agregarPorComunidad", () => {
  const filas = agregarPorComunidad(provincias);

  it("agrupa por comunidad", () => {
    expect(filas).toHaveLength(2);
  });

  it("unifica variantes del mismo nombre de comunidad", () => {
    const mixto: AgregadoProvincia[] = [
      prov({ codigo_provincia: 8, provincia: "Barcelona", comunidad: "Cataluña",
             votos_partido: 10, votos_validos: 100 }),
      prov({ codigo_provincia: 17, provincia: "Girona", comunidad: "Catalunya          ",
             votos_partido: 5, votos_validos: 50 }),
    ];
    const agg = agregarPorComunidad(mixto);
    expect(agg).toHaveLength(1);
    expect(agg[0].nombre).toBe("Cataluña");
    expect(agg[0].votos_partido).toBe(15);
  });

  it("suma votos y válidos por comunidad", () => {
    const and = filas.find((f) => f.id === "Andalucía")!;
    expect(and.votos_partido).toBe(45); // 40 + 5
    expect(and.votos_validos).toBe(1500); // 1000 + 500
    expect(and.porcentaje).toBe(porcentaje(45, 1500));
  });

  it("ordena de mayor a menor por votos", () => {
    expect(filas[0].id).toBe("Madrid"); // 100 > 45
  });
});

describe("agregarPorProvincia", () => {
  it("lista las provincias con código a 2 dígitos", () => {
    const filas = agregarPorProvincia(provincias);
    expect(filas).toHaveLength(3);
    const almeria = filas.find((f) => f.id === "04")!;
    expect(almeria.votos_partido).toBe(40);
    expect(almeria.codigo_provincia).toBe(4);
  });

  it("filtra por comunidad cuando se indica", () => {
    const filas = agregarPorProvincia(provincias, "Madrid");
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
    const mapa = valoresPorProvincia(provincias);
    expect(mapa.get("04")?.votos_partido).toBe(40);
    expect(mapa.get("28")?.votos_partido).toBe(100);
  });
});

describe("provinciaAComunidad", () => {
  it("mapea código de provincia a su comunidad", () => {
    const mapa = provinciaAComunidad(provincias);
    expect(mapa.get("04")).toBe("Andalucía");
    expect(mapa.get("28")).toBe("Madrid");
  });
});

// Histórico de prueba: dos tipos de proceso con varias elecciones.
const historico: Historico = {
  Congreso: [
    {
      fichero: "congreso_201912.json",
      periodo: "Diciembre 2019",
      anio: 2019,
      mes: 12,
      total: { votos_partido: 100, votos_validos: 1000 },
      comunidades: {
        "Andalucía": { votos_partido: 60, votos_validos: 600 },
        "Madrid": { votos_partido: 40, votos_validos: 400 },
      },
    },
    {
      fichero: "congreso_200803.json",
      periodo: "Marzo 2008",
      anio: 2008,
      mes: 3,
      total: { votos_partido: 50, votos_validos: 500 },
      comunidades: {
        "Andalucía": { votos_partido: 50, votos_validos: 500 },
      },
    },
  ],
  "Parlamento europeo": [
    {
      fichero: "europeo_201905.json",
      periodo: "Mayo 2019",
      anio: 2019,
      mes: 5,
      total: { votos_partido: 30, votos_validos: 300 },
      comunidades: { "Madrid": { votos_partido: 30, votos_validos: 300 } },
    },
  ],
};

describe("etiquetaPeriodo", () => {
  it("incluye el mes abreviado cuando lo hay", () => {
    expect(etiquetaPeriodo(2019, 12)).toBe("Dic 2019");
  });
  it("usa solo el año cuando no hay mes", () => {
    expect(etiquetaPeriodo(2008, null)).toBe("2008");
  });
});

describe("tiposHistorico", () => {
  it("lista los tipos de proceso ordenados", () => {
    expect(tiposHistorico(historico)).toEqual(["Congreso", "Parlamento europeo"]);
  });
});

describe("comunidadesHistorico", () => {
  it("reúne las comunidades de toda la serie del tipo, ordenadas", () => {
    expect(comunidadesHistorico(historico, "Congreso")).toEqual([
      "Andalucía",
      "Madrid",
    ]);
  });
});

describe("serieHistorica", () => {
  it("devuelve el total nacional por defecto", () => {
    const serie = serieHistorica(historico, "Congreso", TODAS_COMUNIDADES);
    expect(serie.map((p) => p.votos_partido)).toEqual([100, 50]);
    expect(serie[0].etiqueta).toBe("Dic 2019");
  });

  it("filtra por comunidad", () => {
    const serie = serieHistorica(historico, "Congreso", "Madrid");
    expect(serie.map((p) => p.votos_partido)).toEqual([40, 0]);
    expect(serie[0].porcentaje).toBe(porcentaje(40, 400));
  });

  it("devuelve 0 si la comunidad no aparece en una elección", () => {
    const serie = serieHistorica(historico, "Congreso", "Madrid");
    // En la elección de 2008 no hay datos de Madrid.
    expect(serie[1]).toMatchObject({ votos_partido: 0, votos_validos: 0, porcentaje: 0 });
  });

  it("devuelve una serie vacía para un tipo inexistente", () => {
    expect(serieHistorica(historico, "Inexistente")).toEqual([]);
  });
});
