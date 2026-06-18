"""Utilidades compartidas por los tests del procesador.

Construye ficheros XLSX sintéticos con la misma estructura que los oficiales
(fila de título con 'Resultados por', fila de nombres completos y fila de
cabeceras que empieza por 'Nombre de Comunidad').
"""
from __future__ import annotations

import openpyxl
import pytest

# Columnas de metadatos en el orden en que aparecen en los XLSX oficiales.
CABECERAS_META = [
    "Nombre de Comunidad",
    "Código de Provincia",
    "Nombre de Provincia",
    "Código de Municipio",
    "Nombre de Municipio",
    "Total censo electoral",
    "Total votantes",
    "Votos válidos",
    "Votos a candidaturas",
]


def construir_xlsx(
    ruta,
    *,
    titulo="Congreso | Julio 2023 | Resultados por municipio",
    municipios=None,
    incluir_partido=True,
    nombre_partido="Por Un Mundo Más Justo",
    siglas_partido="PUM+J",
):
    """Crea un XLSX de prueba en `ruta`.

    `municipios` es una lista de dicts con claves: comunidad, cod_prov,
    provincia, cod_mun, municipio, censo, votantes, validos, candidaturas y
    (si `incluir_partido`) votos_partido.
    """
    if municipios is None:
        municipios = [
            dict(comunidad="Andalucía", cod_prov=4, provincia="Almería",
                 cod_mun=1, municipio="Abla", censo=995, votantes=747,
                 validos=741, candidaturas=737, votos_partido=3),
            dict(comunidad="Andalucía", cod_prov=4, provincia="Almería",
                 cod_mun=3, municipio="Adra", censo=17557, votantes=11748,
                 validos=11623, candidaturas=11551, votos_partido=11),
        ]

    wb = openpyxl.Workbook()
    ws = wb.active

    # Fila 1: título.
    ws.append([titulo])

    # Fila 2: nombres completos. Solo la columna del partido lleva nombre.
    fila_nombres = [""] * len(CABECERAS_META)
    if incluir_partido:
        fila_nombres.append(nombre_partido)
    ws.append(fila_nombres)

    # Fila 3: cabeceras (siglas). La del partido lleva sus siglas.
    fila_cab = list(CABECERAS_META)
    if incluir_partido:
        fila_cab.append(siglas_partido)
    ws.append(fila_cab)

    # Filas de datos.
    for m in municipios:
        fila = [
            m["comunidad"], m["cod_prov"], m["provincia"], m["cod_mun"],
            m["municipio"], m["censo"], m["votantes"], m["validos"],
            m["candidaturas"],
        ]
        if incluir_partido:
            fila.append(m.get("votos_partido", 0))
        ws.append(fila)

    wb.save(ruta)
    return ruta


@pytest.fixture
def hacer_xlsx(tmp_path):
    """Devuelve una función que crea un XLSX de prueba en un tmp_path."""

    def _hacer(nombre="entrada.xlsx", **kwargs):
        return construir_xlsx(tmp_path / nombre, **kwargs)

    return _hacer
