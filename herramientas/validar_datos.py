#!/usr/bin/env python3
"""Validador de los JSON procesados y de su coherencia con los GeoJSON del mapa.

Comprueba, para cada fichero de `resultados-oficiales-procesados/*.json`:
  - El esquema (campos esperados en eleccion / partido / totales / provincias /
    resultados).
  - La coherencia de los totales (el agregado por provincia suma lo mismo que
    los totales nacionales).
  - Que `resultados` solo contenga municipios con votos del partido (> 0) y que
    sus votos sumen el total nacional del partido.
  - Los códigos INE (5 dígitos = provincia(2) + municipio(3)) y su unicidad.
  - Códigos de provincia válidos (1..52) y votos_partido <= votos_validos.

Y, de forma cruzada con el mapa:
  - Que cada código de provincia presente en los datos tenga su GeoJSON de
    municipios (web/public/geo/municipios/NN.json).
  - Que los GeoJSON (provincias y municipios) sean JSON válido.

Sale con código 1 si hay algún fallo (pensado para CI).

Uso:
    python herramientas/validar_datos.py [--datos DIR] [--geo DIR]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

CAMPOS_ELECCION = {"tipo", "periodo", "anio", "mes", "ambito",
                   "fuente_archivo", "fecha_procesado"}
CAMPOS_TOTALES = {"votos_partido", "votos_validos", "votos_candidaturas",
                  "porcentaje_validos", "municipios"}
CAMPOS_REGISTRO = {"comunidad", "codigo_provincia", "provincia",
                   "codigo_municipio", "municipio", "codigo_ine", "censo",
                   "votantes", "votos_validos", "votos_candidaturas",
                   "votos_partido"}
CAMPOS_PROVINCIA = {"codigo_provincia", "provincia", "comunidad",
                    "votos_partido", "votos_validos", "votos_candidaturas",
                    "municipios"}


def valida_json(ruta: Path, errores: list[str]) -> dict | None:
    """Comprueba un JSON procesado. Devuelve los datos o None si no parsea."""
    nombre = ruta.name
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errores.append(f"{nombre}: JSON inválido: {e}")
        return None

    # Estructura de primer nivel.
    for clave in ("eleccion", "partido", "totales", "provincias", "resultados"):
        if clave not in datos:
            errores.append(f"{nombre}: falta la clave de primer nivel '{clave}'")
    if not isinstance(datos.get("resultados"), list):
        errores.append(f"{nombre}: 'resultados' debe ser una lista")
        return datos
    if not isinstance(datos.get("provincias"), list):
        errores.append(f"{nombre}: 'provincias' debe ser una lista")
        return datos

    # Campos de cada bloque.
    faltan_e = CAMPOS_ELECCION - datos.get("eleccion", {}).keys()
    if faltan_e:
        errores.append(f"{nombre}: faltan campos en 'eleccion': {sorted(faltan_e)}")
    faltan_t = CAMPOS_TOTALES - datos.get("totales", {}).keys()
    if faltan_t:
        errores.append(f"{nombre}: faltan campos en 'totales': {sorted(faltan_t)}")

    prov = datos["provincias"]
    if not prov:
        errores.append(f"{nombre}: 'provincias' está vacío")
        return datos
    for i, p in enumerate(prov):
        faltan_p = CAMPOS_PROVINCIA - p.keys()
        if faltan_p:
            errores.append(f"{nombre}.provincias[{i}]: faltan campos: {sorted(faltan_p)}")

    res = datos["resultados"]

    # Coherencia de totales: el agregado por provincia (calculado sobre todos
    # los municipios) debe reconstruir exactamente los totales nacionales.
    t = datos.get("totales", {})
    pp = sum(p.get("votos_partido", 0) for p in prov)
    pv = sum(p.get("votos_validos", 0) for p in prov)
    pc = sum(p.get("votos_candidaturas", 0) for p in prov)
    pm = sum(p.get("municipios", 0) for p in prov)
    if t.get("votos_partido") != pp:
        errores.append(f"{nombre}: totales.votos_partido={t.get('votos_partido')} "
                       f"no coincide con la suma por provincia {pp}")
    if t.get("votos_validos") != pv:
        errores.append(f"{nombre}: totales.votos_validos={t.get('votos_validos')} "
                       f"no coincide con la suma por provincia {pv}")
    if t.get("votos_candidaturas") != pc:
        errores.append(f"{nombre}: totales.votos_candidaturas="
                       f"{t.get('votos_candidaturas')} no coincide con la suma por "
                       f"provincia {pc}")
    if t.get("municipios") != pm:
        errores.append(f"{nombre}: totales.municipios={t.get('municipios')} "
                       f"no coincide con la suma de municipios por provincia {pm}")
    pct = round(100 * pp / pv, 4) if pv else 0
    if t.get("porcentaje_validos") != pct:
        errores.append(f"{nombre}: totales.porcentaje_validos="
                       f"{t.get('porcentaje_validos')} no coincide con {pct}")

    # `resultados` solo contiene municipios con votos del partido y, sumados,
    # deben dar el total nacional del partido (nada con votos se ha perdido).
    sp = sum(r.get("votos_partido", 0) for r in res)
    if t.get("votos_partido") != sp:
        errores.append(f"{nombre}: totales.votos_partido={t.get('votos_partido')} "
                       f"no coincide con la suma de resultados {sp}")

    # Registros: campos, INE, provincia, votos.
    vistos: set[str] = set()
    for i, r in enumerate(res):
        faltan_r = CAMPOS_REGISTRO - r.keys()
        if faltan_r:
            errores.append(f"{nombre}[{i}]: faltan campos: {sorted(faltan_r)}")
            continue
        ine = r.get("codigo_ine")
        if ine is not None:
            if not (isinstance(ine, str) and len(ine) == 5 and ine.isdigit()):
                errores.append(f"{nombre}[{i}]: codigo_ine inválido: {ine!r}")
            elif ine in vistos:
                errores.append(f"{nombre}: codigo_ine duplicado: {ine}")
            else:
                vistos.add(ine)
        cod_prov = r.get("codigo_provincia")
        if cod_prov is not None and not (1 <= cod_prov <= 52):
            errores.append(f"{nombre}[{i}]: codigo_provincia fuera de rango: {cod_prov}")
        if r.get("votos_partido", 0) <= 0:
            errores.append(f"{nombre}[{i}] ({r.get('municipio')}): "
                           f"votos_partido debe ser > 0 en 'resultados'")
        if r.get("votos_partido", 0) > r.get("votos_validos", 0):
            errores.append(f"{nombre}[{i}] ({r.get('municipio')}): "
                           f"votos_partido > votos_validos")
    return datos


def codigos_provincia(datos: dict) -> set[str]:
    """Códigos de provincia (2 dígitos) presentes en el agregado por provincia.

    Se usa el agregado `provincias` (no `resultados`) porque cubre todas las
    provincias de la elección —incluidas aquellas sin votos del partido—, que
    son las que el mapa puede mostrar y para las que hace falta su GeoJSON.
    """
    cods = set()
    for p in datos.get("provincias", []):
        cp = p.get("codigo_provincia")
        if cp is not None:
            cods.add(f"{cp:02d}")
    return cods


def valida_geojson(geo_dir: Path, provincias_necesarias: set[str],
                   errores: list[str]) -> None:
    """Comprueba que los GeoJSON existen, son válidos y cubren las provincias."""
    provincias = geo_dir / "provincias.geojson"
    if not provincias.exists():
        errores.append(f"falta {provincias}")
    else:
        try:
            json.loads(provincias.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errores.append(f"{provincias}: JSON inválido: {e}")

    muni_dir = geo_dir / "municipios"
    for cod in sorted(provincias_necesarias):
        f = muni_dir / f"{cod}.json"
        if not f.exists():
            errores.append(f"falta el GeoJSON de municipios para la provincia "
                           f"{cod}: {f}")
            continue
        try:
            json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errores.append(f"{f}: JSON inválido: {e}")


def main(argv=None) -> int:
    raiz = Path(__file__).resolve().parent.parent
    p = argparse.ArgumentParser(description="Valida los JSON procesados y los GeoJSON.")
    p.add_argument("--datos", type=Path,
                   default=raiz / "resultados-oficiales-procesados")
    p.add_argument("--geo", type=Path, default=raiz / "web" / "public" / "geo")
    args = p.parse_args(argv)

    errores: list[str] = []
    ficheros = sorted(args.datos.glob("*.json"))
    if not ficheros:
        print(f"AVISO: no hay JSON en {args.datos}")

    provincias_necesarias: set[str] = set()
    for ruta in ficheros:
        datos = valida_json(ruta, errores)
        if datos:
            provincias_necesarias |= codigos_provincia(datos)

    valida_geojson(args.geo, provincias_necesarias, errores)

    if errores:
        print(f"VALIDACIÓN FALLIDA: {len(errores)} problema(s):", file=sys.stderr)
        for e in errores:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"OK: {len(ficheros)} fichero(s) válidos; "
          f"{len(provincias_necesarias)} provincia(s) con GeoJSON.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
