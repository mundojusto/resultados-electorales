import { useMemo, useRef, useState } from "react";
import {
  CALENDARIO,
  DIAS_UTILES,
  ESTADOS,
  ETIQUETA_SEDE,
  INICIO_RECOGIDA,
  PROVINCIAS_AVALES,
  ULTIMO_DIA,
  avalesRecogidos,
  diaNumero,
  escenarios,
  fechaCorta,
  fmt,
  hoyISO,
  minimoLegal,
  momento,
  objetivo,
  totales,
  tramo,
  type ProvinciaAvales,
} from "./avales";
import { COLOR_SEDE, MapaAvales, type ModoMapa } from "./MapaAvales";
import { interpolaColor } from "../colores";

// Formulario común mientras la Comisión Electoral no publique el impreso de
// cada provincia (campo `url_impreso` del JSON, que tiene prioridad).
const IMPRESO_PROVISIONAL = `${import.meta.env.BASE_URL}avales/formulario-avales-provisional.pdf`;

// Firma en línea común a todas las provincias; `url_boreal` del JSON, si se
// rellena, tiene prioridad.
const BOREAL_AVALES = "https://www.boreal.es/avales";

export function PanelAvales() {
  const provincias = PROVINCIAS_AVALES;
  const porCodigo = useMemo(
    () => new Map(provincias.map((p) => [p.codigo, p])),
    [provincias],
  );
  const [codigoSel, setCodigoSel] = useState<string>("28");
  const [modo, setModo] = useState<ModoMapa>("necesarios");
  const [orden, setOrden] = useState<"comunidad" | "avales">("comunidad");
  const fichaRef = useRef<HTMLDivElement>(null);

  const hayRecuento = provincias.some((p) => avalesRecogidos(p) != null);
  const sel = porCodigo.get(codigoSel) ?? provincias[0];

  function seleccionar(codigo: string, desplazar = false) {
    setCodigoSel(codigo);
    if (desplazar) fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="avales">
      <Portada />
      <Calendario />

      <section className="av-bloque">
        <h2>Provincia a provincia</h2>
        <p className="av-intro">
          Cada provincia exige las firmas del 0,1 % de su censo: una por cada mil electores.
          Pulsa una provincia en el mapa o en la tabla para ver su ficha.
        </p>
        <div className="av-mapa-ficha">
          <div className="panel-mapa">
            <div className="av-modos" role="tablist" aria-label="Qué muestra el mapa">
              <BotonModo actual={modo} valor="necesarios" onClick={setModo}>
                Avales necesarios
              </BotonModo>
              <BotonModo actual={modo} valor="sede" onClick={setModo}>
                Implantación
              </BotonModo>
              {hayRecuento && (
                <BotonModo actual={modo} valor="progreso" onClick={setModo}>
                  Progreso
                </BotonModo>
              )}
            </div>
            <MapaAvales
              provincias={porCodigo}
              modo={modo}
              seleccionada={codigoSel}
              onSeleccionar={(c) => seleccionar(c)}
            />
            <LeyendaMapa modo={modo} />
          </div>
          <div ref={fichaRef}>
            <FichaProvincia
              p={sel}
              provincias={provincias}
              onCambiar={(c) => seleccionar(c)}
            />
          </div>
        </div>
        <TablaProvincias
          provincias={provincias}
          orden={orden}
          onOrden={setOrden}
          seleccionada={codigoSel}
          onSeleccionar={(c) => seleccionar(c, true)}
        />
      </section>

      <Escenarios provincias={provincias} />
      <Guia />
      <Preguntas />
      <Fuentes />
    </div>
  );
}

// --- Portada con cuenta atrás -------------------------------------------------

function Portada() {
  const t = totales(PROVINCIAS_AVALES);
  const m = momento(hoyISO());
  return (
    <section className="av-portada">
      <div className="av-portada__texto">
        <p className="av-antetitulo">Elecciones generales · 29 de noviembre</p>
        <h2>Recogida de avales</h2>
        <p>
          M+J no tiene representación en el Congreso ni en el Senado. Para estar en la papeleta
          de una provincia necesitamos las firmas de, al menos, una de cada mil personas
          inscritas en su censo. Sin esas firmas, en esa provincia no hay candidatura.
        </p>
        <p className="av-aviso">
          Fechas calculadas suponiendo que la convocatoria se publica en el BOE el martes 6 de
          octubre. Si sale otro día, todo el calendario se desplaza los mismos días.
        </p>
      </div>
      <div className="av-cuenta">
        {m.tipo === "antes" && (
          <>
            <span className="av-cuenta__num">{m.dias}</span>
            <span className="av-cuenta__txt">
              {m.dias === 1 ? "día" : "días"} para empezar la recogida
              <br />
              <small>Arranca el {fechaCorta(INICIO_RECOGIDA)}. Antes de esa fecha ninguna firma vale.</small>
            </span>
          </>
        )}
        {m.tipo === "recogida" && (
          <>
            <span className="av-cuenta__num">{m.quedan}</span>
            <span className="av-cuenta__txt">
              {m.quedan === 1 ? "día" : "días"} hasta el cierre del {fechaCorta(ULTIMO_DIA)}
              <br />
              <small>Hoy es el día {m.dia} de recogida.</small>
            </span>
          </>
        )}
        {m.tipo === "cerrada" && (
          <span className="av-cuenta__txt">El plazo de recogida está cerrado.</span>
        )}
      </div>
      <div className="resumen av-resumen">
        <Dato valor="40–42" etiqueta="provincias a las que aspiramos (de 52)" />
        <Dato valor={fmt(t.minimo)} etiqueta="avales mínimos si vamos a las 52" />
        <Dato valor={fmt(t.objetivo30)} etiqueta="objetivo recomendado (+30 %)" />
        <Dato valor={String(DIAS_UTILES)} etiqueta="días útiles de recogida" />
      </div>
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

// --- Calendario -------------------------------------------------------------

function Calendario() {
  const inicio = diaNumero(CALENDARIO[0].desde);
  const fin = diaNumero(CALENDARIO[CALENDARIO.length - 1].hasta);
  const total = fin - inicio + 1;
  const hoy = diaNumero(hoyISO());
  const posHoy = hoy >= inicio && hoy <= fin ? ((hoy - inicio + 0.5) / total) * 100 : null;

  return (
    <section className="av-bloque">
      <h2>Calendario</h2>
      <p className="av-intro">
        Hay 15 días útiles si queremos presentar con margen. Contar con el 26 como colchón es
        un error que otros partidos pequeños han pagado caro.
      </p>
      <div className="av-linea" aria-hidden="true">
        {CALENDARIO.map((h, i) => {
          const izq = ((diaNumero(h.desde) - inicio) / total) * 100;
          const ancho = ((diaNumero(h.hasta) - diaNumero(h.desde) + 1) / total) * 100;
          return (
            <div
              key={h.titulo}
              className={`av-linea__tramo av-linea__tramo--${i} ${h.clave ? "clave" : ""}`}
              style={{ left: `${izq}%`, width: `${ancho}%` }}
              title={`${tramo(h)} · ${h.titulo}`}
            />
          );
        })}
        {posHoy != null && (
          <div className="av-linea__hoy" style={{ left: `${posHoy}%` }}>
            <span>hoy</span>
          </div>
        )}
        <span className="av-linea__marca" style={{ left: "0%" }}>6 oct</span>
        <span
          className="av-linea__marca"
          style={{ left: `${((diaNumero("2026-10-20") - inicio + 0.5) / total) * 100}%` }}
        >
          20 oct
        </span>
        <span
          className="av-linea__marca"
          style={{ left: `${((diaNumero(ULTIMO_DIA) - inicio + 0.5) / total) * 100}%` }}
        >
          26 oct
        </span>
        <span className="av-linea__marca av-linea__marca--fin" style={{ left: "100%" }}>2 nov</span>
      </div>
      <ol className="av-hitos">
        {CALENDARIO.map((h, i) => (
          <li key={h.titulo} className={h.clave ? "clave" : ""}>
            <span className={`av-hitos__punto av-linea__tramo--${i}`} />
            <span className="av-hitos__fecha">{tramo(h)}</span>
            <span>
              <strong>{h.titulo}.</strong> {h.detalle}
            </span>
          </li>
        ))}
        <li>
          <span className="av-hitos__punto av-hitos__punto--voto" />
          <span className="av-hitos__fecha">29 nov</span>
          <span>
            <strong>Votación.</strong> La campaña empieza el 13 de noviembre; hasta entonces, en
            las mesas de avales se piden firmas, no el voto.
          </span>
        </li>
      </ol>
    </section>
  );
}

// --- Mapa, ficha y tabla ------------------------------------------------------

function BotonModo({
  actual,
  valor,
  onClick,
  children,
}: {
  actual: ModoMapa;
  valor: ModoMapa;
  onClick: (m: ModoMapa) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={actual === valor}
      className={`av-modo ${actual === valor ? "activa" : ""}`}
      onClick={() => onClick(valor)}
    >
      {children}
    </button>
  );
}

function LeyendaMapa({ modo }: { modo: ModoMapa }) {
  if (modo === "sede") {
    return (
      <p className="leyenda av-leyenda">
        {(Object.keys(COLOR_SEDE) as (keyof typeof COLOR_SEDE)[]).map((k) => (
          <span key={k}>
            <i style={{ background: COLOR_SEDE[k] }} /> {ETIQUETA_SEDE[k]}
          </span>
        ))}
      </p>
    );
  }
  return (
    <p className="leyenda av-leyenda">
      <span>{modo === "progreso" ? "0 %" : "Menos firmas"}</span>
      <i
        className="av-leyenda__degradado"
        style={{ background: `linear-gradient(90deg, ${interpolaColor(0)}, ${interpolaColor(1)})` }}
      />
      <span>{modo === "progreso" ? "objetivo +30 %" : "Más firmas"}</span>
    </p>
  );
}

function FichaProvincia({
  p,
  provincias,
  onCambiar,
}: {
  p: ProvinciaAvales;
  provincias: ProvinciaAvales[];
  onCambiar: (codigo: string) => void;
}) {
  const min = minimoLegal(p.censo);
  const o20 = objetivo(p.censo, 0.2);
  const o30 = objetivo(p.censo, 0.3);
  const recogidos = avalesRecogidos(p);
  const escala = o30 * 1.1;
  const pct = (v: number) => `${Math.min(100, (v / escala) * 100)}%`;
  const ordenadas = useMemo(
    () => [...provincias].sort((a, b) => a.provincia.localeCompare(b.provincia, "es")),
    [provincias],
  );

  return (
    <article className="av-ficha">
      <label className="av-ficha__selector">
        Provincia
        <select value={p.codigo} onChange={(e) => onCambiar(e.target.value)}>
          {ordenadas.map((q) => (
            <option key={q.codigo} value={q.codigo}>
              {q.provincia}
            </option>
          ))}
        </select>
      </label>
      <header>
        <h3>{p.provincia}</h3>
        <p>
          {p.comunidad} · <span className={`av-sede av-sede--${p.sede}`}>{ETIQUETA_SEDE[p.sede]}</span>
          {p.seleccionada === true && <span className="av-etiqueta">Vamos</span>}
          {p.seleccionada === false && <span className="av-etiqueta av-etiqueta--no">No se presenta</span>}
        </p>
      </header>

      <div className="av-ficha__cifra">
        <span>{fmt(min)}</span>
        avales como mínimo legal
      </div>

      <div className="av-barra" aria-label={`Mínimo ${min}, objetivo ${o20} a ${o30}`}>
        {recogidos != null && (
          <div className="av-barra__relleno" style={{ width: pct(recogidos) }} />
        )}
        <div className="av-barra__marca" style={{ left: pct(min) }} data-tipo="min" />
        <div className="av-barra__marca" style={{ left: pct(o20) }} />
        <div className="av-barra__marca" style={{ left: pct(o30) }} />
      </div>
      <dl className="av-ficha__objetivos">
        <div>
          <dt>Mínimo legal</dt>
          <dd>{fmt(min)}</dd>
        </div>
        <div>
          <dt>Objetivo +20 %</dt>
          <dd>{fmt(o20)}</dd>
        </div>
        <div className="destacado">
          <dt>Objetivo +30 %</dt>
          <dd>{fmt(o30)}</dd>
        </div>
      </dl>

      {recogidos != null ? (
        <p className="av-ficha__recuento">
          <strong>{fmt(recogidos)}</strong> avales recogidos · Estado: <strong>{p.estado}</strong>
        </p>
      ) : (
        <p className="av-ficha__recuento av-ficha__recuento--vacio">
          El recuento se publicará aquí cuando empiece la recogida.
        </p>
      )}

      <dl className="av-ficha__datos">
        <div>
          <dt>Censo aproximado</dt>
          <dd>{fmt(p.censo)}</dd>
        </div>
        <div>
          <dt>Escaños al Congreso</dt>
          <dd>{p.congreso}</dd>
        </div>
        <div>
          <dt>Candidaturas al Senado</dt>
          <dd>{p.senado}</dd>
        </div>
      </dl>

      <div className="av-ficha__botones">
        <Enlace url={p.url_boreal ?? BOREAL_AVALES} principal>
          Avala en línea con Boreal
        </Enlace>
        {p.url_impreso ? (
          <Enlace url={p.url_impreso}>Descargar impreso oficial (PDF)</Enlace>
        ) : (
          <Enlace url={IMPRESO_PROVISIONAL} etiqueta="Provisional">
            Descargar impreso oficial (PDF)
          </Enlace>
        )}
      </div>
    </article>
  );
}

function Enlace({
  url,
  principal,
  etiqueta,
  children,
}: {
  url: string | null;
  principal?: boolean;
  etiqueta?: string;
  children: React.ReactNode;
}) {
  const clase = `av-boton ${principal ? "av-boton--principal" : ""}`;
  if (!url) {
    return (
      <span className={`${clase} av-boton--inactivo`} title="Disponible tras la convocatoria">
        {children}
        <small>Disponible desde el 6 de octubre</small>
      </span>
    );
  }
  return (
    <a className={clase} href={url} target="_blank" rel="noopener noreferrer">
      <span>
        {children}
        {etiqueta && <span className="av-boton__etiqueta">{etiqueta}</span>}
      </span>
    </a>
  );
}

function TablaProvincias({
  provincias,
  orden,
  onOrden,
  seleccionada,
  onSeleccionar,
}: {
  provincias: ProvinciaAvales[];
  orden: "comunidad" | "avales";
  onOrden: (o: "comunidad" | "avales") => void;
  seleccionada: string;
  onSeleccionar: (codigo: string) => void;
}) {
  const max = Math.max(...provincias.map((p) => minimoLegal(p.censo)));

  // Por comunidad: grupos con su subtotal. Por avales: una única lista.
  const grupos = useMemo(() => {
    if (orden === "avales") {
      return [{ nombre: null, filas: [...provincias].sort((a, b) => b.censo - a.censo) }];
    }
    const m = new Map<string, ProvinciaAvales[]>();
    for (const p of provincias) m.set(p.comunidad, [...(m.get(p.comunidad) ?? []), p]);
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([nombre, filas]) => ({ nombre, filas }));
  }, [provincias, orden]);

  const t = totales(provincias);

  return (
    <div className="av-tabla">
      <div className="av-tabla__cabecera">
        <h3>Avales por provincia</h3>
        <label>
          Ordenar
          <select value={orden} onChange={(e) => onOrden(e.target.value as "comunidad" | "avales")}>
            <option value="comunidad">Por comunidad autónoma</option>
            <option value="avales">De más a menos avales</option>
          </select>
        </label>
      </div>
      <div className="av-tabla__scroll">
        <table>
          <thead>
            <tr>
              <th>Provincia</th>
              <th className="num ocultable">Censo aprox.</th>
              <th className="num">Mínimo</th>
              <th className="num ocultable">+20 %</th>
              <th className="num">+30 %</th>
              <th className="av-tabla__col-barra" aria-hidden="true" />
            </tr>
          </thead>
          {grupos.map((g) => (
            <tbody key={g.nombre ?? "todas"}>
              {g.nombre && (
                <tr className="av-tabla__grupo">
                  <th colSpan={6}>
                    {g.nombre}
                    <span className={`av-sede av-sede--${g.filas[0].sede}`}>
                      {ETIQUETA_SEDE[g.filas[0].sede]}
                    </span>
                  </th>
                </tr>
              )}
              {g.filas.map((p) => {
                const min = minimoLegal(p.censo);
                return (
                  <tr
                    key={p.codigo}
                    className={`fila-link ${p.codigo === seleccionada ? "seleccionada" : ""} ${
                      p.seleccionada === false ? "descartada" : ""
                    }`}
                    onClick={() => onSeleccionar(p.codigo)}
                  >
                    <td>{p.provincia}</td>
                    <td className="num ocultable">{fmt(p.censo)}</td>
                    <td className="num destacado">{fmt(min)}</td>
                    <td className="num ocultable">{fmt(objetivo(p.censo, 0.2))}</td>
                    <td className="num">{fmt(objetivo(p.censo, 0.3))}</td>
                    <td className="av-tabla__col-barra">
                      <span
                        className="av-tabla__barra"
                        style={{ width: `${(min / max) * 100}%` }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
          <tfoot>
            <tr>
              <td>Total ({t.provincias})</td>
              <td className="num ocultable">{fmt(t.censo)}</td>
              <td className="num">{fmt(t.minimo)}</td>
              <td className="num ocultable">{fmt(t.objetivo20)}</td>
              <td className="num">{fmt(t.objetivo30)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="leyenda">
        Censo CER + CERA aproximado; las cifras definitivas las da la Oficina del Censo Electoral
        tras la convocatoria. Reparto de escaños de 2023, pendiente del decreto. Estados del
        recuento: {ESTADOS.join(" · ")}.
      </p>
    </div>
  );
}

// --- Escenarios ---------------------------------------------------------------

function Escenarios({ provincias }: { provincias: ProvinciaAvales[] }) {
  const lista = escenarios(provincias);
  const max = Math.max(...lista.map((e) => e.objetivo30));
  const top10 = [...provincias].sort((a, b) => b.censo - a.censo).slice(0, 10);
  const pesoTop10 =
    top10.reduce((s, p) => s + minimoLegal(p.censo), 0) / totales(provincias).minimo;

  return (
    <section className="av-bloque">
      <h2>Qué provincias elegimos cambia el esfuerzo</h2>
      <p className="av-intro">
        La Coordinadora Nacional decide el 5 de octubre en qué 40–42 circunscripciones nos
        presentamos. Las diez provincias más pobladas ({top10.map((p) => p.provincia).join(", ")})
        suponen el {Math.round(pesoTop10 * 100)} % de todos los avales: dejar fuera dos o tres de
        ellas pesa más que dejar fuera diez provincias pequeñas.
      </p>
      <div className="av-escenarios">
        {lista.map((e) => (
          <div key={e.etiqueta} className="av-escenario">
            <span className="av-escenario__nombre">{e.etiqueta}</span>
            <div className="av-escenario__pista">
              <span
                className="av-escenario__min"
                style={{ width: `${(e.minimo / max) * 100}%` }}
              />
              <span
                className="av-escenario__obj"
                style={{ width: `${((e.objetivo30 - e.minimo) / max) * 100}%` }}
              />
            </div>
            <span className="av-escenario__cifras">
              <strong>{fmt(e.objetivo30)}</strong> avales · {fmt(e.porDia)} al día
            </span>
          </div>
        ))}
      </div>
      <p className="leyenda av-leyenda">
        <span>
          <i style={{ background: "var(--terracota)" }} /> Mínimo legal
        </span>
        <span>
          <i style={{ background: "var(--melocoton)" }} /> Margen hasta el +30 %
        </span>
        <span>Ritmo diario calculado sobre {DIAS_UTILES} días útiles.</span>
      </p>
    </section>
  );
}

// --- Guía práctica ------------------------------------------------------------

function Guia() {
  return (
    <section className="av-bloque">
      <h2>Cómo se avala</h2>
      <div className="av-tarjetas">
        <article className="av-tarjeta">
          <h3>Quién puede firmar</h3>
          <ul>
            <li>Personas con nacionalidad española, mayores de edad e inscritas en el censo de la provincia. No hace falta estar afiliada ni votarnos.</li>
            <li>Se firma por la provincia del censo, no por la de residencia: alguien censado en Toledo que firma en Madrid lo hace en el pliego de Toledo.</li>
            <li>Cada elector avala una sola candidatura. Pregunta siempre si ya ha firmado por otro partido.</li>
            <li>La afiliación de otras nacionalidades no puede firmar, pero sí recoger firmas y montar mesas.</li>
          </ul>
        </article>

        <article className="av-tarjeta">
          <h3>Qué se anota</h3>
          <ol className="av-numeros">
            <li>Nombre y apellidos</li>
            <li>Número de DNI</li>
            <li>Fecha de nacimiento</li>
            <li>Firma</li>
          </ol>
          <p>
            En mayúsculas y con letra clara. No hace falta fotocopia del DNI, pero sí pedir que lo
            enseñen: un dígito mal copiado es un aval perdido.
          </p>
        </article>

        <article className="av-tarjeta">
          <h3>Solo en el impreso oficial</h3>
          <p>
            El modelo lo publica el Ministerio del Interior en{" "}
            <a href="https://infoelectoral.interior.gob.es" target="_blank" rel="noopener noreferrer">
              Infoelectoral
            </a>
            . La Comisión Electoral preparará la versión de cada provincia, con la candidatura y la
            circunscripción ya impresas.
          </p>
          <ul>
            <li>Imprimir a tamaño real, sin tocar nada.</li>
            <li>Un pliego por provincia. Nunca mezclar dos en la misma hoja.</li>
            <li>Numerar los pliegos y apuntar quién tiene cada uno.</li>
          </ul>
        </article>

        <article className="av-tarjeta av-tarjeta--si">
          <h3>¿Hace falta notario? No.</h3>
          <p>
            En las generales las firmas no se autentican ante notaría ni juzgado. Las verifica la
            Oficina del Censo Electoral, normalmente por muestreo. Si encuentra fallos, hay 48 horas
            para subsanarlos.
          </p>
        </article>


        <article className="av-tarjeta">
          <h3>En la mesa de recogida</h3>
          <p>Antes de cada firma, tres preguntas:</p>
          <ol className="av-numeros">
            <li>¿Tienes nacionalidad española y eres mayor de edad?</li>
            <li>¿Estás censado en esta provincia?</li>
            <li>¿Has firmado ya por otro partido en estas elecciones?</li>
          </ol>
          <blockquote>
            «Estamos recogiendo firmas para que M+J pueda presentarse en esta provincia. Firmar no
            te compromete a votarnos: solo permite que haya una opción más en la papeleta.»
          </blockquote>
        </article>

        <article className="av-tarjeta">
          <h3>Dónde recoger</h3>
          <ul>
            <li>Mercados y plazas en los días de más gente.</li>
            <li>Salidas de parroquias y centros culturales.</li>
            <li>Asociaciones vecinales y entorno de universidades.</li>
            <li>Exterior de centros de salud.</li>
            <li>Tu gente: familia, vecindario, trabajo. Suelen ser las firmas más limpias.</li>
          </ul>
        </article>

        <article className="av-tarjeta">
          <h3>Cada noche y al final</h3>
          <ul>
            <li>Cada sede envía a la Comisión Electoral el recuento del día por provincia.</li>
            <li>Los pliegos originales van a la persona responsable provincial, que los revisa, quita duplicados y los guarda hasta presentarlos (21–26 de octubre).</li>
          </ul>
        </article>

        <article className="av-tarjeta av-tarjeta--datos">
          <h3>Protección de datos</h3>
          <ul>
            <li>Los pliegos solo sirven para presentar la candidatura: no van a la base de afiliación ni se usan para enviar propaganda.</li>
            <li>No se fotografían ni se mandan por WhatsApp o correo.</li>
            <li>Se guardan bajo llave y nunca se dejan solos en la mesa.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

// --- Preguntas frecuentes ------------------------------------------------------

const PREGUNTAS: [string, string][] = [
  ["¿Firmar obliga a votarnos?", "No. El aval solo permite que la candidatura se presente. El voto sigue siendo libre y secreto."],
  ["¿Puedo recoger firmas antes del 6 de octubre?", "No. Solo cuentan las firmas recogidas después de que la convocatoria salga en el BOE."],
  ["¿Puedo avalar por internet?", "Sí, a través de Boreal (www.boreal.es/avales), si tienes certificado digital o DNI electrónico. Si no lo tienes, firma en papel en una mesa."],
  ["¿Una persona afiliada puede firmar en dos provincias?", "No. Solo en la provincia donde está censada y una única vez."],
  ["¿Se puede retirar un aval?", "Una vez presentada la candidatura, retirarlo ya no tiene efecto."],
  ["¿Las firmas sirven para el Congreso y el Senado?", "Trabajamos con una sola cifra por provincia para las dos cámaras. Está pendiente de confirmar con la Junta Electoral Provincial; si hiciera falta un juego de firmas por cámara, el esfuerzo se duplicaría."],
];

function Preguntas() {
  return (
    <section className="av-bloque">
      <h2>Preguntas frecuentes</h2>
      <div className="av-faq">
        {PREGUNTAS.map(([p, r]) => (
          <details key={p}>
            <summary>{p}</summary>
            <p>{r}</p>
          </details>
        ))}
      </div>
      <p className="av-contacto">
        Dudas sobre impresos y requisitos: Comisión Electoral.
      </p>
    </section>
  );
}

function Fuentes() {
  return (
    <section className="av-bloque av-fuentes">
      <h2>Normativa y fuentes</h2>
      <ul>
        <li>
          <a href="https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672" target="_blank" rel="noopener noreferrer">
            Ley Orgánica del Régimen Electoral General (LOREG), art. 169.3
          </a>
        </li>
        <li>
          <a href="https://www.boe.es/buscar/doc.php?id=BOE-A-2011-14814" target="_blank" rel="noopener noreferrer">
            Instrucción 7/2011 de la Junta Electoral Central, sobre firmas de apoyo a candidaturas
          </a>
        </li>
        <li>Real Decreto 605/1999, de regulación complementaria de los procesos electorales (modelos de impresos)</li>
        <li>
          <a href="https://infoelectoral.interior.gob.es" target="_blank" rel="noopener noreferrer">
            Infoelectoral · Ministerio del Interior
          </a>
        </li>
        <li>
          <a href="https://www.juntaelectoralcentral.es/cs/jec/doctrina/instrucciones" target="_blank" rel="noopener noreferrer">
            Junta Electoral Central · Instrucciones
          </a>
        </li>
      </ul>
    </section>
  );
}
