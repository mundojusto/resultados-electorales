#!/usr/bin/env python3
"""Migra los JSON ya procesados al formato optimizado (agregado por provincia).

Los XLSX oficiales se borran tras procesarse, así que los JSON de
`resultados-oficiales-procesados/` son la única fuente de verdad. Este script
los reescribe al nuevo formato sin perder información de los municipios con
votos:

  - Añade el bloque `provincias`: agregado por provincia calculado sobre TODOS
    los municipios (conserva los votos válidos y el número de municipios, que
    son los denominadores de los porcentajes y del mapa).
  - Recorta `resultados` para dejar únicamente los municipios con votos del
    partido (> 0). El grueso del tamaño de cada fichero eran miles de
    municipios con `votos_partido: 0`.

`totales` no cambia (ya estaba calculado sobre todos los municipios).

Es idempotente: los ficheros que ya tienen `provincias` se omiten.

Uso:
    python herramientas/migrar_estructura.py [--datos DIR]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from procesar_resultados import agrega_por_provincia


def migra_fichero(ruta: Path) -> str:
    """Reescribe un JSON al nuevo formato. Devuelve un mensaje de estado."""
    datos = json.loads(ruta.read_text(encoding="utf-8"))

    if "provincias" in datos:
        return f"OMITIDO  {ruta.name}: ya migrado"

    completos = datos.get("resultados", [])
    provincias = agrega_por_provincia(completos)
    con_votos = [r for r in completos if r.get("votos_partido", 0) > 0]

    nuevo = {
        "eleccion": datos["eleccion"],
        "partido": datos["partido"],
        "totales": datos["totales"],
        "provincias": provincias,
        "resultados": con_votos,
    }
    ruta.write_text(
        json.dumps(nuevo, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return (f"OK       {ruta.name}: {len(completos)} -> {len(con_votos)} "
            f"municipios, {len(provincias)} provincias")


def main(argv=None) -> int:
    raiz = Path(__file__).resolve().parent.parent
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--datos", type=Path,
                   default=raiz / "resultados-oficiales-procesados")
    args = p.parse_args(argv)

    ficheros = sorted(args.datos.glob("*.json"))
    for ruta in ficheros:
        print(migra_fichero(ruta))
    print(f"\n{len(ficheros)} fichero(s) procesado(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
