import { useEffect, useMemo, useState } from "react";
import {
  agregarPorComunidad,
  agregarPorProvincia,
  cargarEleccion,
  cargarIndice,
  municipiosDeProvincia,
  provinciaAComunidad,
  valoresPorProvincia,
} from "./data";
import type {
  DatosEleccion,
  EntradaIndice,
  FilaAgregada,
  Metrica,
  Nivel,
} from "./types";
import { MapaProvincias } from "./components/MapaProvincias";
import { MapaMunicipios } from "./components/MapaMunicipios";
import { PanelLista } from "./components/PanelLista";

export default function App() {
  const [indice, setIndice] = useState<EntradaIndice[]>([]);
  const [fichero, setFichero] = useState<string>("");
  const [datos, setDatos] = useState<DatosEleccion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comunidad, setComunidad] = useState<string | null>(null);
  const [provincia, setProvincia] = useState<number | null>(null);
  const [metrica, setMetrica] = useState<Metrica>("votos");

  // Carga el índice de elecciones al inicio.
  useEffect(() => {
    cargarIndice()
      .then((idx) => {
        setIndice(idx);
        if (idx.length) setFichero(idx[0].fichero);
      })
      .catch((e) => setError(e.message));
  }, []);

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

  return (
    <div className="app">
      <header className="cabecera">
        <div>
          <h1>Resultados Electorales · M+J</h1>
          <p className="sub">Por Un Mundo Más Justo — resultados oficiales por territorio</p>
        </div>
        <div className="controles">
          <label>
            Elección
            <select value={fichero} onChange={(e) => setFichero(e.target.value)}>
              {indice.map((e) => (
                <option key={e.fichero} value={e.fichero}>
                  {e.tipo} — {e.periodo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Métrica
            <select value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)}>
              <option value="votos">Votos</option>
              <option value="porcentaje">% sobre válidos</option>
            </select>
          </label>
        </div>
      </header>

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

      {error && <div className="error">⚠ {error}</div>}
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
