import { useEffect, useMemo, useState } from "react";
import {
  TODAS_COMUNIDADES,
  agregarPorComunidad,
  agregarPorProvincia,
  cargarEleccion,
  cargarHistorico,
  cargarIndice,
  comunidadesHistorico,
  municipiosDeProvincia,
  provinciaAComunidad,
  tiposHistorico,
  valoresPorProvincia,
} from "./data";
import type {
  DatosEleccion,
  EntradaIndice,
  FilaAgregada,
  Historico,
  Metrica,
  Nivel,
  Vista,
} from "./types";
import { MapaProvincias } from "./components/MapaProvincias";
import { MapaMunicipios } from "./components/MapaMunicipios";
import { PanelLista } from "./components/PanelLista";
import { PanelHistorico } from "./components/PanelHistorico";

export default function App() {
  const [indice, setIndice] = useState<EntradaIndice[]>([]);
  const [fichero, setFichero] = useState<string>("");
  const [datos, setDatos] = useState<DatosEleccion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comunidad, setComunidad] = useState<string | null>(null);
  const [provincia, setProvincia] = useState<number | null>(null);
  const [metrica, setMetrica] = useState<Metrica>("votos");

  const [vista, setVista] = useState<Vista>("exploracion");
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [tipoHist, setTipoHist] = useState<string>("");
  const [comunidadHist, setComunidadHist] = useState<string>(TODAS_COMUNIDADES);

  // Carga el índice de elecciones al inicio.
  useEffect(() => {
    cargarIndice()
      .then((idx) => {
        setIndice(idx);
        if (idx.length) setFichero(idx[0].fichero);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Carga el histórico (ligero) al inicio para la vista comparativa.
  useEffect(() => {
    cargarHistorico()
      .then((h) => {
        setHistorico(h);
        const tipos = tiposHistorico(h);
        if (tipos.length) setTipoHist(tipos[0]);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Al cambiar de tipo de proceso, reinicia la comunidad si ya no existe en él.
  function seleccionarTipoHist(t: string) {
    setTipoHist(t);
    if (
      historico &&
      comunidadHist !== TODAS_COMUNIDADES &&
      !comunidadesHistorico(historico, t).includes(comunidadHist)
    ) {
      setComunidadHist(TODAS_COMUNIDADES);
    }
  }

  // Carga la elección seleccionada.
  useEffect(() => {
    if (!fichero) return;
    setCargando(true);
    setError(null);
    cargarEleccion(fichero)
      .then((d) => {
        setDatos(d);
        setComunidad(null);
        setProvincia(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [fichero]);

  const registros = datos?.resultados ?? [];

  const valoresMapa = useMemo(() => valoresPorProvincia(registros), [registros]);
  const provComunidad = useMemo(() => provinciaAComunidad(registros), [registros]);

  const nivel: Nivel = provincia != null ? "municipio" : comunidad ? "provincia" : "comunidad";

  const filas: FilaAgregada[] = useMemo(() => {
    if (provincia != null) return municipiosDeProvincia(registros, provincia);
    if (comunidad) return agregarPorProvincia(registros, comunidad);
    return agregarPorComunidad(registros);
  }, [registros, comunidad, provincia]);

  // Valores por municipio (clave: código INE) para el mapa municipal.
  const valoresMunicipio = useMemo(() => {
    if (provincia == null) return new Map<string, FilaAgregada>();
    return new Map(filas.map((f) => [f.id, f]));
  }, [filas, provincia]);

  function seleccionarFila(f: FilaAgregada) {
    if (nivel === "comunidad") setComunidad(f.nombre);
    else if (nivel === "provincia") setProvincia(f.codigo_provincia ?? null);
  }

  function seleccionarProvinciaMapa(codigo: number, com: string) {
    setComunidad(com || null);
    setProvincia(codigo);
  }

  // Selector principal en dos pasos: tipo de elección + año/fecha. El fichero
  // seleccionado sigue siendo la fuente de verdad; el tipo se deriva de él.
  const tiposExploracion = useMemo(() => {
    const s = new Set<string>();
    for (const e of indice) if (e.tipo) s.add(e.tipo);
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [indice]);

  const tipoSel = indice.find((e) => e.fichero === fichero)?.tipo ?? "";

  // Elecciones del tipo seleccionado, ordenadas cronológicamente (antigua → reciente).
  const eleccionesTipo = useMemo(
    () =>
      indice
        .filter((e) => e.tipo === tipoSel)
        .sort((a, b) => (a.anio ?? 0) - (b.anio ?? 0) || (a.mes ?? 0) - (b.mes ?? 0)),
    [indice, tipoSel],
  );

  // Al cambiar el tipo, salta a la elección más reciente de ese tipo.
  function seleccionarTipoEleccion(t: string) {
    const reciente = indice
      .filter((e) => e.tipo === t)
      .sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0) || (b.mes ?? 0) - (a.mes ?? 0))[0];
    if (reciente) setFichero(reciente.fichero);
  }

  return (
    <div className="app">
      <header className="cabecera">
        <div>
          <h1>Resultados Electorales · M+J</h1>
          <p className="sub">Por Un Mundo Más Justo — resultados oficiales por territorio</p>
        </div>
        <div className="controles">
          {vista === "exploracion" && (
            <>
              <label>
                Tipo de elección
                <select
                  value={tipoSel}
                  onChange={(e) => seleccionarTipoEleccion(e.target.value)}
                >
                  {tiposExploracion.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Año / fecha
                <select value={fichero} onChange={(e) => setFichero(e.target.value)}>
                  {eleccionesTipo.map((e) => (
                    <option key={e.fichero} value={e.fichero}>
                      {e.periodo ?? e.anio}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Métrica
            <select value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)}>
              <option value="votos">Votos</option>
              <option value="porcentaje">% sobre válidos</option>
            </select>
          </label>
        </div>
      </header>

      <nav className="pestanas">
        <button
          className={`pestana ${vista === "exploracion" ? "activa" : ""}`}
          onClick={() => setVista("exploracion")}
        >
          Exploración por territorio
        </button>
        <button
          className={`pestana ${vista === "historico" ? "activa" : ""}`}
          onClick={() => setVista("historico")}
        >
          Histórico
        </button>
      </nav>

      {error && <div className="error">⚠ {error}</div>}

      {vista === "historico" ? (
        historico && tipoHist ? (
          <PanelHistorico
            historico={historico}
            tipo={tipoHist}
            comunidad={comunidadHist}
            metrica={metrica}
            onTipo={seleccionarTipoHist}
            onComunidad={setComunidadHist}
          />
        ) : (
          <div className="cargando">Cargando histórico…</div>
        )
      ) : (
        <>
          {datos && (
            <div className="resumen">
              <Dato etiqueta="Votos M+J" valor={datos.totales.votos_partido.toLocaleString("es-ES")} />
              <Dato etiqueta="% s/válidos" valor={`${datos.totales.porcentaje_validos.toFixed(4)}%`} />
              <Dato etiqueta="Municipios" valor={datos.totales.municipios.toLocaleString("es-ES")} />
              <Dato etiqueta="Partido" valor={(datos.partido.siglas ?? datos.partido.nombre ?? "—").replace("PUM+J", "M+J")} />
            </div>
          )}

          <nav className="migas">
            <button className="miga" onClick={() => { setComunidad(null); setProvincia(null); }}>
              España
            </button>
            {comunidad && (
              <>
                <span className="sep">›</span>
                <button className="miga" onClick={() => setProvincia(null)}>{comunidad}</button>
              </>
            )}
            {provincia != null && (
              <>
                <span className="sep">›</span>
                <span className="miga actual">
                  {registros.find((r) => r.codigo_provincia === provincia)?.provincia}
                </span>
              </>
            )}
          </nav>

          {cargando && <div className="cargando">Cargando…</div>}

          {datos && !cargando && (
            <main className="contenido">
              <PanelLista nivel={nivel} filas={filas} metrica={metrica} onSeleccionar={seleccionarFila} />
              <div className="panel-mapa">
                {provincia != null ? (
                  <MapaMunicipios
                    codigoProvincia={provincia}
                    valores={valoresMunicipio}
                    metrica={metrica}
                  />
                ) : (
                  <MapaProvincias
                    valores={valoresMapa}
                    provinciaComunidad={provComunidad}
                    metrica={metrica}
                    comunidadSel={comunidad}
                    provinciaSel={provincia}
                    onSelectProvincia={seleccionarProvinciaMapa}
                  />
                )}
                <p className="leyenda">
                  Color por {metrica === "votos" ? "votos a M+J" : "% sobre votos válidos"}.
                  {provincia != null
                    ? " Mapa por municipio. Usa las migas de pan para volver."
                    : " Haz clic en una provincia para ver sus municipios."}
                </p>
              </div>
            </main>
          )}
        </>
      )}

      <footer className="pie">
        Datos oficiales procesados · M+J. Código abierto en el repositorio.
      </footer>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="dato">
      <span className="dato__valor">{valor}</span>
      <span className="dato__etiqueta">{etiqueta}</span>
    </div>
  );
}
