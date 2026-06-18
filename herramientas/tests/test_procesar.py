"""Tests del procesador de resultados (herramientas/procesar_resultados.py)."""
from __future__ import annotations

import json

import procesar_resultados as pr
import pytest


# --- Funciones puras ---------------------------------------------------------
class TestNormaliza:
    def test_mayusculas_y_sin_acentos(self):
        assert pr.normaliza("Almería") == "ALMERIA"

    def test_none_es_cadena_vacia(self):
        assert pr.normaliza(None) == ""

    def test_colapsa_espacios(self):
        assert pr.normaliza("  Por   Un  Mundo ") == "POR UN MUNDO"

    def test_numeros(self):
        assert pr.normaliza(2023) == "2023"


class TestAInt:
    @pytest.mark.parametrize("valor,esperado", [
        (5, 5), ("7", 7), (3.0, 3), (None, 0), ("", 0), ("abc", 0),
    ])
    def test_conversion(self, valor, esperado):
        assert pr.a_int(valor) == esperado


class TestSlug:
    def test_basico(self):
        assert pr.slug("Congreso") == "congreso"

    def test_acentos_y_simbolos(self):
        assert pr.slug("Elecciones Europeas 2024") == "elecciones-europeas-2024"


class TestParseaTitulo:
    def test_completo(self):
        tipo, periodo, anio, mes = pr.parsea_titulo(
            "Congreso | Julio 2023 | Resultados por municipio"
        )
        assert tipo == "Congreso"
        assert periodo == "Julio 2023"
        assert anio == 2023
        assert mes == 7

    def test_sin_mes(self):
        tipo, periodo, anio, mes = pr.parsea_titulo("Senado | 2019 | Resultados")
        assert anio == 2019
        assert mes is None

    def test_vacio(self):
        assert pr.parsea_titulo(None) == (None, None, None, None)


class TestNombreSalida:
    def test_con_anio_y_mes(self):
        datos = {"eleccion": {"tipo": "Congreso", "anio": 2023, "mes": 7}}
        assert pr.nombre_salida(datos) == "congreso_202307.json"

    def test_sin_mes(self):
        datos = {"eleccion": {"tipo": "Senado", "anio": 2019, "mes": None}}
        assert pr.nombre_salida(datos) == "senado_2019.json"

    def test_sin_anio(self):
        datos = {"eleccion": {"tipo": "Europeas", "anio": None, "mes": None}}
        assert pr.nombre_salida(datos) == "europeas.json"


# --- Procesado (integración) -------------------------------------------------
class TestProcesa:
    def test_extrae_metadatos_y_totales(self, hacer_xlsx):
        entrada = hacer_xlsx()
        datos = pr.procesa(entrada)

        assert datos["eleccion"]["tipo"] == "Congreso"
        assert datos["eleccion"]["anio"] == 2023
        assert datos["eleccion"]["mes"] == 7
        assert datos["partido"]["siglas"] == "PUM+J"

        t = datos["totales"]
        assert t["municipios"] == 2
        assert t["votos_partido"] == 14          # 3 + 11
        assert t["votos_validos"] == 12364        # 741 + 11623
        assert t["porcentaje_validos"] == round(100 * 14 / 12364, 4)

    def test_codigo_ine_compuesto(self, hacer_xlsx):
        datos = pr.procesa(hacer_xlsx())
        assert datos["resultados"][0]["codigo_ine"] == "04001"
        assert datos["resultados"][1]["codigo_ine"] == "04003"

    def test_detecta_partido_por_siglas_alternativas(self, hacer_xlsx):
        datos = pr.procesa(hacer_xlsx(siglas_partido="M+J", nombre_partido="Otra cosa"))
        assert datos["partido"]["siglas"] == "M+J"
        assert datos["totales"]["votos_partido"] == 14

    def test_detecta_coalicion_existe(self, hacer_xlsx):
        # En las europeas M+J concurrió dentro de la coalición "Existe": la
        # columna oficial lleva el nombre/siglas de la coalición, no los de M+J.
        datos = pr.procesa(hacer_xlsx(
            titulo="Parlamento Europeo | Junio 2024 | Resultados por municipio",
            nombre_partido="Existe", siglas_partido="EXISTE"))
        assert datos["partido"]["siglas"] == "EXISTE"
        assert datos["partido"]["nombre"] == "Existe"
        assert datos["totales"]["votos_partido"] == 14

    def test_omite_filas_sin_municipio(self, hacer_xlsx):
        municipios = [
            dict(comunidad="Andalucía", cod_prov=4, provincia="Almería",
                 cod_mun=1, municipio="Abla", censo=995, votantes=747,
                 validos=741, candidaturas=737, votos_partido=3),
            dict(comunidad="Andalucía", cod_prov=4, provincia="Almería",
                 cod_mun=0, municipio="", censo=0, votantes=0,
                 validos=0, candidaturas=0, votos_partido=0),
        ]
        datos = pr.procesa(hacer_xlsx(municipios=municipios))
        assert datos["totales"]["municipios"] == 1

    def test_partido_no_presente(self, hacer_xlsx):
        entrada = hacer_xlsx(incluir_partido=False)
        with pytest.raises(pr.PartidoNoPresente):
            pr.procesa(entrada)

    def test_falla_si_no_hay_cabecera(self, tmp_path):
        import openpyxl
        wb = openpyxl.Workbook()
        wb.active.append(["sin", "cabeceras", "reconocibles"])
        ruta = tmp_path / "mala.xlsx"
        wb.save(ruta)
        with pytest.raises(ValueError):
            pr.procesa(ruta)


# --- main() (end to end) -----------------------------------------------------
class TestMain:
    def test_genera_json_y_borra_entrada(self, hacer_xlsx, tmp_path):
        entrada = hacer_xlsx()
        salida = tmp_path / "out"
        cod = pr.main([str(entrada), "--salida", str(salida), "--borrar-entrada"])
        assert cod == 0
        assert not entrada.exists()

        destino = salida / "congreso_202307.json"
        assert destino.exists()
        datos = json.loads(destino.read_text(encoding="utf-8"))
        assert datos["totales"]["votos_partido"] == 14

    def test_partido_no_presente_no_genera_json(self, hacer_xlsx, tmp_path):
        entrada = hacer_xlsx(incluir_partido=False)
        salida = tmp_path / "out"
        cod = pr.main([str(entrada), "--salida", str(salida)])
        assert cod == 0
        assert not salida.exists() or not list(salida.glob("*.json"))

    def test_entrada_inexistente(self, tmp_path):
        cod = pr.main([str(tmp_path / "no_existe.xlsx")])
        assert cod == 1
