import { useMemo } from "react";
import type { Historico, Metrica, PuntoHistorico } from "../types";
import {
  TODAS_COMUNIDADES,
  comunidadesHistorico,
  serieHistorica,
  tiposHistorico,
} from "../data";
import { interpolaColor } from "../colores";

// Valor del desplegable de año/fecha cuando no se resalta ninguna elección.
const SIN_DESTACAR = "";

interface Props {
  historico: Historico;
  tipo: string;
  comunidad: string;
  fichero: string;
  metrica: Metrica;
  onTipo: (tipo: string) => void;
  onComunidad: (comunidad: string) => void;
  onFichero: (fichero: string) => void;
}

export function PanelHistorico({
  historico,
  tipo,
  comunidad,
  fichero,
  metrica,
  onTipo,
  onComunidad,
  onFichero,
}: Props) {
  const tipos = useMemo(() => tiposHistorico(historico), [historico]);
  const comunidades = useMemo(
    () => comunidadesHistorico(historico, tipo),
    [historico, tipo],
  );
  const serie = useMemo(
    () => serieHistorica(historico, tipo, comunidad),
    [historico, tipo, comunidad],
  );

  const ambito =
    comunidad === TODAS_COMUNIDADES ? "Total nacional" : comunidad;

  return (
    <div className="panel-historico">
      <div className="panel-historico__controles">
        <label>
          Tipo de elección
          <select value={tipo} onChange={(e) => onTipo(e.target.value)}>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Año / fecha
          <select value={fichero} onChange={(e) => onFichero(e.target.value)}>
            <option value={SIN_DESTACAR}>Todo el histórico</option>
            {serie.map((p) => (
              <option key={p.fichero} value={p.fichero}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comunidad autónoma
          <select value={comunidad} onChange={(e) => onComunidad(e.target.value)}>
            <option value={TODAS_COMUNIDADES}>Todas (total nacional)</option>
            {comunidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="panel-historico__titulo">
        Histórico de {metrica === "votos" ? "votos a M+J" : "% sobre válidos"} ·{" "}
        <strong>{tipo}</strong> · {ambito}
      </p>

      {serie.length === 0 ? (
        <p className="panel-historico__vacio">
          No hay elecciones de este tipo en los datos disponibles.
        </p>
      ) : (
        <>
          <GraficoBarras serie={serie} metrica={metrica} destacado={fichero} />
          <TablaHistorico serie={serie} metrica={metrica} destacado={fichero} />
        </>
      )}
    </div>
  );
}

function valorDe(p: PuntoHistorico, metrica: Metrica): number {
  return metrica === "votos" ? p.votos_partido : p.porcentaje;
}

function formatear(p: PuntoHistorico, metrica: Metrica): string {
  return metrica === "votos"
    ? p.votos_partido.toLocaleString("es-ES")
    : `${p.porcentaje.toFixed(3)}%`;
}

function GraficoBarras({
  serie,
  metrica,
  destacado,
}: {
  serie: PuntoHistorico[];
  metrica: Metrica;
  destacado: string;
}) {
  // Lienzo con coordenadas internas; el SVG se escala al ancho disponible.
  const W = 720;
  const H = 320;
  const M = { top: 24, right: 16, bottom: 56, left: 64 };
  const areaW = W - M.left - M.right;
  const areaH = H - M.top - M.bottom;

  const max = Math.max(1, ...serie.map((p) => valorDe(p, metrica)));
  const n = serie.length;
  const paso = areaW / n;
  const anchoBarra = Math.min(72, paso * 0.62);

  // Líneas de referencia horizontales.
  const ticks = 4;
  const lineas = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (max / ticks) * i;
    const y = M.top + areaH - (v / max) * areaH;
    const etiqueta =
      metrica === "votos"
        ? Math.round(v).toLocaleString("es-ES")
        : `${v.toFixed(2)}%`;
    return { y, etiqueta };
  });

  return (
    <div className="grafico" role="img" aria-label="Gráfico histórico de resultados">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {lineas.map((l, i) => (
          <g key={i}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={l.y}
              y2={l.y}
              stroke="#ecdfd3"
              strokeWidth={1}
            />
            <text x={M.left - 8} y={l.y + 4} className="grafico__eje" textAnchor="end">
              {l.etiqueta}
            </text>
          </g>
        ))}

        {serie.map((p, i) => {
          const v = valorDe(p, metrica);
          const h = (v / max) * areaH;
          const x = M.left + paso * i + (paso - anchoBarra) / 2;
          const y = M.top + areaH - h;
          const color = interpolaColor(0.35 + 0.5 * Math.sqrt(v / max));
          // Si hay una elección destacada, las demás se atenúan para resaltarla.
          const hayDestacado = destacado !== "";
          const esDestacado = p.fichero === destacado;
          return (
            <g
              key={p.fichero}
              opacity={hayDestacado && !esDestacado ? 0.3 : 1}
            >
              <rect
                x={x}
                y={y}
                width={anchoBarra}
                height={Math.max(0, h)}
                rx={3}
                fill={color}
                stroke={esDestacado ? "#765043" : "none"}
                strokeWidth={esDestacado ? 2.5 : 0}
              >
                <title>
                  {p.etiqueta}: {formatear(p, metrica)}
                </title>
              </rect>
              {v > 0 && (
                <text
                  x={x + anchoBarra / 2}
                  y={y - 6}
                  className="grafico__valor"
                  textAnchor="middle"
                >
                  {formatear(p, metrica)}
                </text>
              )}
              <text
                x={x + anchoBarra / 2}
                y={H - M.bottom + 18}
                className={`grafico__etiqueta ${esDestacado ? "destacada" : ""}`}
                textAnchor="middle"
              >
                {p.etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TablaHistorico({
  serie,
  metrica,
  destacado,
}: {
  serie: PuntoHistorico[];
  metrica: Metrica;
  destacado: string;
}) {
  return (
    <table className="panel-historico__tabla">
      <thead>
        <tr>
          <th>Elección</th>
          <th className="num">Votos M+J</th>
          <th className="num">% válidos</th>
        </tr>
      </thead>
      <tbody>
        {serie.map((p) => (
          <tr key={p.fichero} className={p.fichero === destacado ? "destacada" : ""}>
            <td>{p.etiqueta}</td>
            <td className={`num ${metrica === "votos" ? "destacado" : ""}`}>
              {p.votos_partido.toLocaleString("es-ES")}
            </td>
            <td className={`num ${metrica === "porcentaje" ? "destacado" : ""}`}>
              {p.porcentaje.toFixed(3)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
