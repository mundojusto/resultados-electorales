// Evolución diaria de la recogida: avales acumulados al cierre de cada día,
// en total o por provincia, con el mínimo legal y el objetivo +30 % como
// referencia. Los puntos los guarda cada mañana herramientas/actualizar_avales.py.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  HISTORIAL_AVALES,
  INICIO_RECOGIDA,
  ULTIMO_DIA,
  diaNumero,
  diasEntre,
  faltanMinimo,
  fechaCorta,
  fmt,
  hoyISO,
  minimoLegal,
  objetivo,
  totales,
  valorPunto,
  type PuntoHistorial,
  type ProvinciaAvales,
} from "./avales";

const D0 = diaNumero(INICIO_RECOGIDA);
const D1 = diaNumero(ULTIMO_DIA);
const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const conSigno = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
const diaDelMes = (iso: string) => Number(iso.slice(8));

/** Techo «redondo» para el eje Y. */
function techo(v: number): number {
  if (v <= 0) return 10;
  const e = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e;
  return 10 * e;
}

export function EvolucionAvales({ provincias }: { provincias: ProvinciaAvales[] }) {
  const puntos = HISTORIAL_AVALES;
  const [sel, setSel] = useState("total");
  const ordenadas = useMemo(
    () => [...provincias].sort((a, b) => a.provincia.localeCompare(b.provincia, "es")),
    [provincias],
  );

  if (!puntos.length) return null;

  const prov = provincias.find((p) => p.codigo === sel);
  const t = totales(provincias);
  const minimo = prov ? minimoLegal(prov.censo) : t.minimo;
  const meta = prov ? objetivo(prov.censo, 0.3) : t.objetivo30;
  const vals = puntos.map((p) => valorPunto(p, sel));
  const ultimo = puntos[puntos.length - 1];
  const valor = vals[vals.length - 1];
  const subida = vals.length > 1 ? valor - vals[vals.length - 2] : null;
  const dias = diasEntre(puntos[0].fecha, ultimo.fecha);
  const media = dias > 0 ? (valor - vals[0]) / dias : null;
  const faltan = faltanMinimo(provincias, ultimo, sel);
  // Días que quedan contando hoy, hasta el 26 incluido.
  const quedan = Math.max(0, diasEntre(hoyISO(), ULTIMO_DIA) + 1);

  return (
    <section className="av-bloque av-evo">
      <h2>Evolución diaria</h2>
      <p className="av-intro">
        Avales acumulados al cierre de cada día. La cifra se toma de la hoja de recogida cada
        mañana; el registro empieza el 15 de octubre.
      </p>

      <label className="av-evo__selector">
        Mostrar
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="total">Todas las provincias</option>
          {ordenadas.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.provincia}
            </option>
          ))}
        </select>
      </label>

      <div className="resumen av-evo__datos">
        <Dato
          valor={fmt(valor)}
          etiqueta={`avales al ${fechaCorta(ultimo.fecha)} · ${Math.round((valor / minimo) * 100)} % del mínimo legal`}
        />
        <Dato
          valor={subida == null ? "—" : conSigno(subida)}
          etiqueta={subida == null ? "subida diaria (falta un segundo día)" : `el ${fechaCorta(ultimo.fecha)}`}
        />
        <Dato
          valor={media == null ? "—" : fmt(Math.round(media))}
          etiqueta={media == null ? "media diaria (con dos días o más)" : "avales al día de media"}
        />
        <Dato
          valor={faltan === 0 ? "Cumplido" : quedan ? fmt(Math.ceil(faltan / quedan)) : "—"}
          etiqueta={
            faltan === 0
              ? "mínimo legal alcanzado"
              : quedan
                ? `al día hasta el 26 oct para el mínimo legal (faltan ${fmt(faltan)})`
                : "plazo cerrado"
          }
        />
      </div>

      <Grafica puntos={puntos} vals={vals} minimo={minimo} meta={meta} />

      <TablaDiaria
        puntos={puntos}
        provincias={provincias}
        sel={sel}
        onSel={(c) => setSel(sel === c ? "total" : c)}
      />
    </section>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="dato">
      <span className="dato__valor">{valor}</span>
      <span className="dato__etiqueta">{etiqueta}</span>
    </div>
  );
}

// --- Gráfica -------------------------------------------------------------------

function Grafica({
  puntos,
  vals,
  minimo,
  meta,
}: {
  puntos: PuntoHistorial[];
  vals: number[];
  minimo: number;
  meta: number;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 260;
  const m = { l: 52, r: 16, t: 20, b: 28 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  // El eje llega al mínimo legal; el objetivo solo se dibuja si cabe sin aplastar la serie.
  const ymax = techo(Math.max(1, ...vals, minimo) * 1.05);
  const x = (iso: string) => m.l + ((diaNumero(iso) - D0) / (D1 - D0)) * iw;
  const y = (v: number) => m.t + ih - (v / ymax) * ih;
  const xs = puntos.map((p) => x(p.fecha));
  const ys = vals.map(y);
  const linea = xs.map((px, i) => `${i ? "L" : "M"}${px.toFixed(1)},${ys[i].toFixed(1)}`).join("");

  const paso = iw / (D1 - D0) >= 30 ? 1 : iw / (D1 - D0) >= 16 ? 2 : 4;
  const etiquetasX: string[] = [];
  for (let d = D0; d <= D1; d++) {
    if ((d - D0) % paso === 0 || d === D1) etiquetasX.push(new Date(d * 86_400_000).toISOString().slice(0, 10));
  }
  const ultimoX = xs[xs.length - 1];

  function mover(e: PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let mejor = 0;
    xs.forEach((v, i) => {
      if (Math.abs(v - px) < Math.abs(xs[mejor] - px)) mejor = i;
    });
    setHover(mejor);
  }

  const refs: [number, string, string][] = [[minimo, "minimo", `Mínimo legal ${fmt(minimo)}`]];
  if (meta <= ymax) refs.push([meta, "meta", `Objetivo +30 % ${fmt(meta)}`]);

  return (
    <div className="av-evo__grafica" ref={caja}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Avales acumulados por día. Último dato: ${fmt(vals[vals.length - 1])}.`}
      >
        {ultimoX < x(ULTIMO_DIA) && (
          <rect className="futuro" x={ultimoX + 4} y={m.t} width={x(ULTIMO_DIA) - ultimoX - 4} height={ih} />
        )}
        {[1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line className="rejilla" x1={m.l} x2={W - m.r} y1={y((ymax / 4) * i)} y2={y((ymax / 4) * i)} />
            <text x={m.l - 8} y={y((ymax / 4) * i) + 4} textAnchor="end">
              {fmt((ymax / 4) * i)}
            </text>
          </g>
        ))}
        <line className="base" x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} />
        <text x={m.l - 8} y={y(0) + 4} textAnchor="end">
          0
        </text>
        {etiquetasX.map((iso) => (
          <text key={iso} x={x(iso)} y={H - 8} textAnchor="middle">
            {diaDelMes(iso)}
          </text>
        ))}
        {refs.map(([v, cls, txt]) => (
          <g key={cls}>
            <line className={`ref ref--${cls}`} x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
            <text className={`ref-txt ref-txt--${cls}`} x={W - m.r} y={y(v) - 5} textAnchor="end">
              {txt}
            </text>
          </g>
        ))}
        {xs.length > 1 && (
          <>
            <path className="area" d={`${linea}L${ultimoX.toFixed(1)},${y(0)}L${xs[0].toFixed(1)},${y(0)}Z`} />
            <path className="linea" d={linea} />
          </>
        )}
        {xs.map((px, i) => (
          <circle key={puntos[i].fecha} className="punto" cx={px} cy={ys[i]} r={i === xs.length - 1 ? 5 : 4} />
        ))}
        <text
          className="valor-final"
          x={ultimoX + (ultimoX > W - m.r - 70 ? -9 : 9)}
          y={ys[ys.length - 1] - 9}
          textAnchor={ultimoX > W - m.r - 70 ? "end" : "start"}
        >
          {fmt(vals[vals.length - 1])}
        </text>
        {hover != null && <line className="cruz" x1={xs[hover]} x2={xs[hover]} y1={m.t} y2={m.t + ih} />}
        <rect
          className="zona"
          x={m.l}
          y={m.t}
          width={iw}
          height={ih}
          onPointerMove={mover}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover != null && (
        <Tooltip
          punto={puntos[hover]}
          valor={vals[hover]}
          previo={hover > 0 ? { fecha: puntos[hover - 1].fecha, valor: vals[hover - 1] } : null}
          left={xs[hover]}
          top={ys[hover]}
          ancho={W}
        />
      )}
    </div>
  );
}

function Tooltip({
  punto,
  valor,
  previo,
  left,
  top,
  ancho,
}: {
  punto: PuntoHistorial;
  valor: number;
  previo: { fecha: string; valor: number } | null;
  left: number;
  top: number;
  ancho: number;
}) {
  const dia = DIAS_SEMANA[new Date(diaNumero(punto.fecha) * 86_400_000).getUTCDay()];
  // Centrado sobre el punto, sin salirse por los lados.
  const izquierda = Math.max(4, Math.min(ancho - 184, left - 90));
  return (
    <div className="av-evo__tip" style={{ left: izquierda, top: Math.max(4, top - 62) }}>
      {dia} {fechaCorta(punto.fecha)}
      <br />
      <b>{fmt(valor)}</b> avales
      {previo && ` · ${conSigno(valor - previo.valor)} desde el ${diaDelMes(previo.fecha)}`}
    </div>
  );
}

// --- Tabla por provincia ------------------------------------------------------------

function TablaDiaria({
  puntos,
  provincias,
  sel,
  onSel,
}: {
  puntos: PuntoHistorial[];
  provincias: ProvinciaAvales[];
  sel: string;
  onSel: (codigo: string) => void;
}) {
  const ultimo = puntos[puntos.length - 1];
  const filas = provincias
    .filter((p) => (ultimo.prov[p.codigo] ?? 0) > 0)
    .sort(
      (a, b) =>
        (ultimo.prov[b.codigo] ?? 0) - (ultimo.prov[a.codigo] ?? 0) ||
        a.provincia.localeCompare(b.provincia, "es"),
    );
  let maxSubida = 1;
  for (const p of filas)
    for (let i = 1; i < puntos.length; i++)
      maxSubida = Math.max(maxSubida, (puntos[i].prov[p.codigo] ?? 0) - (puntos[i - 1].prov[p.codigo] ?? 0));

  const celda = (v: number, base: boolean, key: string) => {
    if (base) return <td key={key}>{fmt(v)}</td>;
    if (v === 0) return <td key={key} className="nada">·</td>;
    const f = v / maxSubida;
    const intensidad = v < 0 ? 0 : f > 0.75 ? 85 : f > 0.5 ? 60 : f > 0.25 ? 38 : 18;
    return (
      <td
        key={key}
        className={v < 0 ? "baja" : f > 0.5 ? "fuerte" : undefined}
        style={intensidad ? { background: `color-mix(in srgb, var(--terracota) ${intensidad}%, transparent)` } : undefined}
      >
        {conSigno(v)}
      </td>
    );
  };
  const fila = (clave: string, nombre: string, get: (p: PuntoHistorial) => number, cls?: string) => (
    <tr key={clave} className={cls} onClick={clave === "total" ? undefined : () => onSel(clave)}>
      <th scope="row">{nombre}</th>
      {puntos.map((p, i) => celda(i === 0 ? get(p) : get(p) - get(puntos[i - 1]), i === 0, p.fecha))}
      <td>
        <b>{fmt(get(ultimo))}</b>
      </td>
    </tr>
  );

  return (
    <details className="av-evo__tabla">
      <summary>Lo recogido cada día, provincia a provincia</summary>
      <p className="av-intro">
        La primera columna es lo acumulado el primer día registrado; las siguientes, lo sumado
        cada día. Pulsa una provincia para verla en la gráfica.
      </p>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Provincia</th>
              {puntos.map((p, i) => (
                <th key={p.fecha}>{(i === 0 ? "A " : "") + fechaCorta(p.fecha)}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) =>
              fila(p.codigo, p.provincia, (pt) => pt.prov[p.codigo] ?? 0, sel === p.codigo ? "sel" : undefined),
            )}
          </tbody>
          <tfoot>{fila("total", "Total", (pt) => pt.total)}</tfoot>
        </table>
      </div>
    </details>
  );
}
