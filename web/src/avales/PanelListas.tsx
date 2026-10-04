import { useEffect, useMemo, useRef, useState } from "react";
import {
  ETIQUETA_SEDE,
  PROVINCIAS_AVALES,
  diaNumero,
  fechaCorta,
  fmt,
  hoyISO,
  minimoLegal,
  type ProvinciaAvales,
} from "./avales";
import {
  CALENDARIO_DETALLADO,
  SEMANAS,
  SUPLENTES_CONGRESO_RECOM,
  diaDesdeBoe,
  escenariosPersonas,
  estadoEvento,
  fechaEvento,
  personasMinimo,
  personasRecomendado,
  porComunidad,
  proximoPlazo,
  totalesPersonas,
} from "./listas";
import { COLOR_SEDE, MapaAvales, type ModoMapa } from "./MapaAvales";
import { interpolaColor } from "../colores";

// Senado por islas: cuántas candidaturas hay en cada isla de la provincia.
const SENADO_ISLAS: Record<string, string> = {
  "07": "Mallorca 2, Menorca 1, Eivissa-Formentera 1.",
  "35": "Gran Canaria 2, Fuerteventura 1, Lanzarote 1.",
  "38": "Tenerife 2, La Palma 1, La Gomera 1, El Hierro 1.",
  "51": "Una sola candidatura al Senado.",
  "52": "Una sola candidatura al Senado.",
};

export function PanelListas() {
  const provincias = PROVINCIAS_AVALES;
  const porCodigo = useMemo(() => new Map(provincias.map((p) => [p.codigo, p])), [provincias]);
  const [codigoSel, setCodigoSel] = useState("28");
  const [modo, setModo] = useState<ModoMapa>("personas");
  const fichaRef = useRef<HTMLDivElement>(null);
  const hoy = hoyISO();
  const sel = porCodigo.get(codigoSel) ?? provincias[0];

  function seleccionar(codigo: string, desplazar = false) {
    setCodigoSel(codigo);
    if (desplazar) fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="avales listas">
      <Portada hoy={hoy} />
      <Esencial />
      <Calendario hoy={hoy} />
      <Requisitos />

      <section className="av-bloque">
        <h2>Cuántas personas hacen falta en cada provincia</h2>
        <p className="av-intro">
          Cada provincia necesita tantas personas titulares al Congreso como escaños, tres
          candidaturas al Senado con sus suplentes (menos en las islas, Ceuta y Melilla) y, como
          recomendación, dos suplentes al Congreso. Cada persona cuenta una sola vez.
        </p>
        <div className="av-mapa-ficha">
          <div className="panel-mapa">
            <div className="av-modos" role="tablist" aria-label="Qué muestra el mapa">
              <BotonModo actual={modo} valor="personas" onClick={setModo}>
                Personas necesarias
              </BotonModo>
              <BotonModo actual={modo} valor="sede" onClick={setModo}>
                Implantación
              </BotonModo>
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
            <FichaProvincia p={sel} provincias={provincias} onCambiar={(c) => seleccionar(c)} />
          </div>
        </div>
        <TablaPersonas
          provincias={provincias}
          seleccionada={codigoSel}
          onSeleccionar={(c) => seleccionar(c, true)}
        />
        <Escenarios provincias={provincias} />
      </section>

      <Funciones />
      <Tareas hoy={hoy} />
      <Figuras />
      <section className="av-bloque">
        <h2>Dinero y límites de la campaña</h2>
        <div className="av-tarjetas">
          <Dinero />
          <Prohibido />
        </div>
      </section>
      <Envios />
      <Preguntas />
      <Fuentes />
    </div>
  );
}

// --- Portada con el próximo plazo --------------------------------------------

function Portada({ hoy }: { hoy: string }) {
  const t = totalesPersonas(PROVINCIAS_AVALES);
  const prox = proximoPlazo(hoy);
  return (
    <section className="av-portada">
      <div className="av-portada__texto">
        <p className="av-antetitulo">Elecciones generales · 29 de noviembre</p>
        <h2>Listas, calendario y tareas</h2>
        <p>
          Para presentarnos en una provincia hacen falta tres cosas a la vez: avales suficientes,
          listas completas y una persona que firme y presente el expediente ante la Junta
          Electoral Provincial. Si falla cualquiera de ellas, en esa provincia no hay candidatura.
          Esta página trata de las dos últimas; las firmas tienen su propia pestaña.
        </p>
        <p className="av-aviso">
          Fechas calculadas suponiendo que la convocatoria se publica en el BOE el martes 6 de
          octubre: si sale otro día, todo se desplaza los mismos días. El reparto de escaños es el
          de 2023 y lo confirmará el decreto. Los plazos internos los fija M+J para llegar con
          margen; los demás son plazos legales de la LOREG.
        </p>
      </div>
      <div className="av-cuenta">
        {prox ? (
          <>
            <span className="av-cuenta__num">{prox.dias === 0 ? "Hoy" : prox.dias}</span>
            <span className="av-cuenta__txt">
              {prox.dias === 0 ? "vence el próximo plazo" : prox.dias === 1 ? "día para el próximo plazo" : "días para el próximo plazo"}
              <br />
              <small>
                {fechaCorta(prox.vence)} · {resumenPlazo(prox.evento)}
              </small>
            </span>
          </>
        ) : (
          <span className="av-cuenta__txt">Han pasado todos los plazos del calendario.</span>
        )}
      </div>
      <div className="resumen av-resumen">
        <Dato valor={fmt(t.minimo)} etiqueta="personas para cubrir las 52 provincias" />
        <Dato valor={fmt(t.recomendado)} etiqueta="con los suplentes recomendados" />
        <Dato valor="9–14" etiqueta="personas en una provincia media" />
        <Dato valor="19 oct" etiqueta="aceptaciones y DNI de todas las personas" />
      </div>
    </section>
  );
}

function resumenPlazo(e: (typeof CALENDARIO_DETALLADO)[number]): string {
  const texto = e.que === "—" ? e.sede : e.que;
  const frase = texto.split(". ")[0].replace(/\.$/, "");
  return e.interno ? `${frase} (plazo interno)` : frase;
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="dato">
      <span className="dato__valor">{valor}</span>
      <span className="dato__etiqueta">{etiqueta}</span>
    </div>
  );
}

function Esencial() {
  return (
    <section className="av-bloque">
      <h2>Lo esencial</h2>
      <ol className="li-esencial">
        <li>
          Sin avales, listas completas y una persona que presente el expediente no hay
          candidatura. Basta con que falle una de las tres.
        </li>
        <li>
          Una provincia media necesita <strong>entre 9 y 14 personas</strong> solo para cumplir el
          mínimo legal. Madrid necesita 43; Barcelona, 38; Valencia, 22.
        </li>
        <li>
          Para cubrir las 52 provincias harían falta <strong>662 personas distintas</strong>. Para
          40–42 provincias, entre 420 y 590, según cuáles se elijan.
        </li>
        <li>
          Las listas se cierran mucho antes que los avales: todas las personas, con su aceptación
          firmada y copia del DNI, <strong>antes del lunes 19 de octubre</strong>.
        </li>
        <li>
          Cada sede nombra <strong>ya</strong> a su responsable electoral provincial. Sin esa
          persona no hay nadie que ponga en marcha el resto.
        </li>
      </ol>
    </section>
  );
}

// --- Calendario detallado ------------------------------------------------------

const PERIODOS: [string, string, boolean?][] = [
  ["5 oct", "Decreto. La Coordinadora decide en qué provincias nos presentamos."],
  ["6 – 26 oct", "Recogida de avales y formación de listas.", true],
  ["21 – 26 oct", "Presentación de candidaturas en cada Junta Electoral Provincial.", true],
  ["28 oct – 2 nov", "Publicación, subsanación de errores y proclamación."],
  ["27 oct – 12 nov", "Precampaña."],
  ["13 – 27 nov", "Campaña electoral.", true],
  ["28 nov", "Jornada de reflexión."],
  ["29 nov", "Votación.", true],
  ["2 dic", "Escrutinio general."],
];

function Calendario({ hoy }: { hoy: string }) {
  const [soloPlazos, setSoloPlazos] = useState(false);
  const filas = CALENDARIO_DETALLADO.filter((e) => !soloPlazos || e.clave || e.interno);
  return (
    <section className="av-bloque">
      <h2>Calendario electoral</h2>
      <div className="li-periodos">
        {PERIODOS.map(([f, t, clave]) => (
          <div key={f + t} className={`li-periodo ${clave ? "clave" : ""}`}>
            <span>{f}</span>
            {t}
          </div>
        ))}
      </div>

      <div className="li-cal__cabecera">
        <h3>Día a día</h3>
        <label>
          <input type="checkbox" checked={soloPlazos} onChange={(e) => setSoloPlazos(e.target.checked)} />
          Solo plazos
        </label>
      </div>
      <div className="li-tabla-scroll">
        <table className="li-tabla li-cal">
          <thead>
            <tr>
              <th>Fecha</th>
              <th className="ocultable">Día</th>
              <th>Qué pasa</th>
              <th>Qué hace la sede</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => {
              const estado = estadoEvento(e, hoy);
              return (
                <tr key={e.desde + e.sede} className={`li-cal--${estado} ${e.clave ? "clave" : ""}`}>
                  <td className="li-cal__fecha">
                    {fechaEvento(e)}
                    {estado === "hoy" && <span className="li-hoy">hoy</span>}
                  </td>
                  <td className="ocultable li-cal__dia">{diaDesdeBoe(e)}</td>
                  <td>{e.que}</td>
                  <td>
                    {e.interno && <span className="li-interno">Plazo interno</span>}
                    {e.sede}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="leyenda">
        En negrita, los plazos legales que no se pueden pasar. «Día» cuenta desde la publicación
        en el BOE (día 0).
      </p>
    </section>
  );
}

// --- Quién puede ir en una lista ---------------------------------------------

function Requisitos() {
  return (
    <section className="av-bloque">
      <h2>Quién puede ir en una lista</h2>
      <div className="av-tarjetas">
        <article className="av-tarjeta">
          <h3>Requisitos</h3>
          <ul>
            <li>
              Nacionalidad española, mayoría de edad e inscripción en el censo electoral.{" "}
              <strong>No hace falta estar censado en la provincia</strong>: una persona de Madrid
              puede ir en la lista de Toledo.
            </li>
            <li>
              No estar en causa de inelegibilidad. Las más comunes: carrera judicial y fiscal en
              activo, militares profesionales, fuerzas y cuerpos de seguridad en activo, miembros
              de las Juntas Electorales y condenas firmes a pena de prisión. Ante la duda,
              consultar a la Comisión Electoral antes de incluir a nadie.
            </li>
            <li>
              Una sola candidatura: nadie puede ir en dos listas ni presentarse a la vez al
              Congreso y al Senado.
            </li>
          </ul>
        </article>

        <article className="av-tarjeta av-tarjeta--si">
          <h3>Personas de otras provincias</h3>
          <p>
            Es legal y será necesario en las provincias sin sede. La afiliación que hoy no
            participa, el entorno de cada persona activa (familia, amistades, parroquia,
            asociación) y personas de otras provincias son las tres fuentes para completar listas.
          </p>
          <p className="av-nota">
            Las cabezas de lista deberían tener arraigo en la provincia siempre que se pueda.
          </p>
        </article>

        <article className="av-tarjeta">
          <h3>Congreso</h3>
          <p>
            Lista cerrada por provincia con tantas personas titulares como escaños y hasta 10
            suplentes. La lista entera, titulares y suplentes sin separar,{" "}
            <strong>alterna mujer y hombre</strong> (LO 2/2024 de paridad; Instrucción 3/2025 de
            la JEC). Si no se cumple, la Junta da 48 horas para corregirlo; si no se corrige,
            rechaza la lista.
          </p>
          <p className="av-nota">
            Recomendamos dos suplentes: no son obligatorios, pero cubren renuncias y bajas y dan
            margen para cuadrar la cremallera si a última hora falla alguien.
          </p>
        </article>

        <article className="av-tarjeta">
          <h3>Senado</h3>
          <p>
            Cada candidatura es individual y <strong>lleva siempre su suplente</strong>. En la
            península presentamos tres por provincia. En las islas la circunscripción es la isla
            (Mallorca, Gran Canaria y Tenerife eligen dos; el resto, una). Ceuta y Melilla, una.
          </p>
          <p className="av-nota">
            Regla práctica: dos mujeres y un hombre o al revés, y cada suplente de sexo distinto
            al de su titular. La Comisión confirmará con la Junta el orden exacto.
          </p>
        </article>

        <article className="av-tarjeta">
          <h3>Documentación de cada persona</h3>
          <ol className="av-numeros">
            <li>Declaración de aceptación de la candidatura, firmada (modelo de la Comisión).</li>
            <li>Copia legible del DNI en vigor, por las dos caras. Mirar la caducidad.</li>
            <li>Teléfono y correo, solo para uso interno.</li>
            <li>Compromiso con los valores y el programa de M+J (Reglamento Interno, art. 89).</li>
          </ol>
          <p className="av-nota">
            Una carpeta física y otra digital por provincia, con una subcarpeta por persona. Nadie
            se da por cerrado hasta tener sus documentos completos y revisados.
          </p>
        </article>

        <article className="av-tarjeta av-tarjeta--datos">
          <h3>Personas no afiliadas y otras nacionalidades</h3>
          <p>
            Se puede incluir a independientes cercanos si aceptan por escrito los valores y el
            programa del partido; la Comisión Electoral decide caso por caso.
          </p>
          <p>
            La afiliación de otras nacionalidades no puede ir en listas ni firmar avales en las
            generales, pero sí recoger avales, atender mesas y trabajar en la campaña.
          </p>
        </article>
      </div>
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
      <span>Menos personas</span>
      <i
        className="av-leyenda__degradado"
        style={{ background: `linear-gradient(90deg, ${interpolaColor(0)}, ${interpolaColor(1)})` }}
      />
      <span>Más personas</span>
    </p>
  );
}

const hayDato = (v: unknown) => v != null;

function FichaProvincia({
  p,
  provincias,
  onCambiar,
}: {
  p: ProvinciaAvales;
  provincias: ProvinciaAvales[];
  onCambiar: (codigo: string) => void;
}) {
  const min = personasMinimo(p);
  const rec = personasRecomendado(p);
  const ordenadas = useMemo(
    () => [...provincias].sort((a, b) => a.provincia.localeCompare(b.provincia, "es")),
    [provincias],
  );
  const conSeguimiento = [
    p.personas_confirmadas,
    p.aceptaciones_recibidas,
    p.cabeza_lista_congreso_confirmada,
    p.representante_designado,
    p.administrador_designado,
    p.fecha_presentacion,
    p.proclamada,
  ].some(hayDato);
  const pct = (v: number) => `${Math.min(100, (v / rec) * 100)}%`;

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
        <span>{min}</span>
        personas como mínimo legal · {rec} recomendadas
      </div>

      <dl className="av-ficha__objetivos li-desglose">
        <div>
          <dt>Congreso · titulares</dt>
          <dd>{p.congreso}</dd>
        </div>
        <div>
          <dt>Congreso · suplentes (recom.)</dt>
          <dd>{SUPLENTES_CONGRESO_RECOM}</dd>
        </div>
        <div>
          <dt>Senado · titulares + suplentes</dt>
          <dd>
            {p.senado} + {p.senado}
          </dd>
        </div>
      </dl>
      {SENADO_ISLAS[p.codigo] && <p className="av-nota li-islas">Senado: {SENADO_ISLAS[p.codigo]}</p>}

      {conSeguimiento ? (
        <div className="li-seguimiento">
          {p.personas_confirmadas != null && (
            <>
              <p className="av-ficha__recuento">
                <strong>{p.personas_confirmadas}</strong> de {rec} personas confirmadas
                {p.aceptaciones_recibidas != null && <> · {p.aceptaciones_recibidas} aceptaciones recibidas</>}
                {p.mujeres != null && p.hombres != null && (
                  <> · {p.mujeres} mujeres y {p.hombres} hombres</>
                )}
              </p>
              <div className="av-barra">
                <div className="av-barra__relleno" style={{ width: pct(p.personas_confirmadas) }} />
                <div className="av-barra__marca" style={{ left: pct(min) }} data-tipo="min" />
              </div>
            </>
          )}
          <ul className="li-hitos-prov">
            <Hito ok={p.cabeza_lista_congreso_confirmada}>Cabeza de lista al Congreso</Hito>
            <Hito ok={p.representante_designado}>Representante de candidatura</Hito>
            <Hito ok={p.administrador_designado}>Administrador/a</Hito>
            <Hito ok={p.fecha_presentacion != null}>
              Presentada{p.fecha_presentacion ? ` el ${fechaCorta(p.fecha_presentacion)}` : ""}
            </Hito>
            <Hito ok={p.proclamada}>Proclamada</Hito>
          </ul>
        </div>
      ) : (
        <p className="av-ficha__recuento av-ficha__recuento--vacio">
          El seguimiento de la lista (personas confirmadas, aceptaciones, designaciones) se
          publicará aquí, siempre en cifras agregadas.
        </p>
      )}

      <dl className="av-ficha__datos">
        <div>
          <dt>Avales mínimos</dt>
          <dd>{fmt(minimoLegal(p.censo))}</dd>
        </div>
        <div>
          <dt>Lista al Congreso, en cremallera</dt>
          <dd>{p.congreso + SUPLENTES_CONGRESO_RECOM} nombres</dd>
        </div>
        <div>
          <dt>Presentar, con margen</dt>
          <dd>21–23 oct</dd>
        </div>
      </dl>
      <div className="av-ficha__botones">
        <a className="av-boton" href="#avales">
          Ver la recogida de avales de {p.provincia}
        </a>
      </div>
    </article>
  );
}

function Hito({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className={ok ? "ok" : ""}>
      <span aria-hidden="true">{ok ? "✓" : "·"}</span> {children}
    </li>
  );
}

function TablaPersonas({
  provincias,
  seleccionada,
  onSeleccionar,
}: {
  provincias: ProvinciaAvales[];
  seleccionada: string;
  onSeleccionar: (codigo: string) => void;
}) {
  const grupos = porComunidad(provincias);
  const t = totalesPersonas(provincias);
  const max = Math.max(...provincias.map(personasMinimo));

  return (
    <div className="av-tabla">
      <div className="av-tabla__cabecera">
        <h3>Personas por provincia</h3>
      </div>
      <div className="av-tabla__scroll">
        <table>
          <thead>
            <tr>
              <th>Provincia</th>
              <th className="num ocultable">Congreso</th>
              <th className="num ocultable">Senado</th>
              <th className="num">Mínimo</th>
              <th className="num">Recom.</th>
              <th className="num ocultable">Avales mín.</th>
              <th className="av-tabla__col-barra" aria-hidden="true" />
            </tr>
          </thead>
          {grupos.map((g) => (
            <tbody key={g.comunidad}>
              <tr className="av-tabla__grupo">
                <th colSpan={7}>
                  {g.comunidad}
                  <span className={`av-sede av-sede--${g.provincias[0].sede}`}>
                    {ETIQUETA_SEDE[g.provincias[0].sede]}
                  </span>
                  {g.provincias.length > 1 && (
                    <span className="li-subtotal">
                      {g.minimo} personas · {g.recomendado} recom.
                    </span>
                  )}
                </th>
              </tr>
              {g.provincias.map((p) => {
                const min = personasMinimo(p);
                return (
                  <tr
                    key={p.codigo}
                    className={`fila-link ${p.codigo === seleccionada ? "seleccionada" : ""} ${
                      p.seleccionada === false ? "descartada" : ""
                    }`}
                    onClick={() => onSeleccionar(p.codigo)}
                  >
                    <td>{p.provincia}</td>
                    <td className="num ocultable">{p.congreso}</td>
                    <td className="num ocultable">
                      {p.senado} + {p.senado}
                    </td>
                    <td className="num destacado">{min}</td>
                    <td className="num">{personasRecomendado(p)}</td>
                    <td className="num ocultable">{fmt(minimoLegal(p.censo))}</td>
                    <td className="av-tabla__col-barra">
                      <span className="av-tabla__barra" style={{ width: `${(min / max) * 100}%` }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
          <tfoot>
            <tr>
              <td>Total ({t.provincias})</td>
              <td className="num ocultable">{t.congreso}</td>
              <td className="num ocultable">
                {t.senado} + {t.senado}
              </td>
              <td className="num">{t.minimo}</td>
              <td className="num">{t.recomendado}</td>
              <td className="num ocultable" />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="leyenda">
        Mínimo legal: titulares al Congreso más candidaturas al Senado con su suplente.
        Recomendado: el mínimo más dos suplentes al Congreso. Reparto de escaños de 2023,
        pendiente del decreto.
      </p>
    </div>
  );
}

function Escenarios({ provincias }: { provincias: ProvinciaAvales[] }) {
  const lista = escenariosPersonas(provincias);
  const max = Math.max(...lista.map((e) => e.recomendado));
  return (
    <div className="li-escenarios">
      <h3>Qué provincias elegimos cambia cuántas personas hacen falta</h3>
      <div className="av-escenarios">
        {lista.map((e) => (
          <div key={e.etiqueta} className="av-escenario">
            <span className="av-escenario__nombre">{e.etiqueta}</span>
            <div className="av-escenario__pista">
              <span className="av-escenario__min" style={{ width: `${(e.minimo / max) * 100}%` }} />
              <span
                className="av-escenario__obj"
                style={{ width: `${((e.recomendado - e.minimo) / max) * 100}%` }}
              />
            </div>
            <span className="av-escenario__cifras">
              <strong>{e.minimo}</strong> personas · {e.recomendado} recomendadas
            </span>
          </div>
        ))}
      </div>
      <p className="av-intro li-lectura">
        Ninguna sede cubre hoy su mínimo solo con las personas que participan activamente; la
        que más se acerca es Madrid. Andalucía tendría que multiplicar por tres sus activas para
        llenar sus ocho provincias, y Cataluña y la Comunitat Valenciana tienen el mismo problema
        concentrado en Barcelona y Valencia. No es imposible, pero exige tirar de la afiliación
        que hoy no participa, del entorno de cada persona activa y de personas de otras
        provincias.
      </p>
      <p className="av-aviso">
        <strong>Propuesta pendiente de la Coordinadora Nacional:</strong> una bolsa nacional de
        candidaturas, gestionada por la Comisión Electoral, en la que cada sede inscriba a las
        personas que le sobren una vez cubiertas sus provincias, para asignarlas a las que no
        lleguen.
      </p>
    </div>
  );
}

// --- Funciones y tareas de la sede ---------------------------------------------

const FUNCIONES: [string, string, string, string][] = [
  ["Responsable electoral provincial", "Coordina todo en la provincia y es el único contacto con la Comisión Electoral.", "La sede, que lo comunica a la Comisión", "Lun 5 oct (interno)"],
  ["Representante de candidatura", "Presenta la candidatura ante la Junta Electoral Provincial, recibe sus comunicaciones, subsana errores y designa apoderados e interventores.", "La sede propone; la designa el representante general", "Propuesta: vie 9 oct. Designación legal: hasta el vie 16 oct"],
  ["Administrador/a de la candidatura", "Responde de los ingresos y gastos de campaña en la provincia, con el administrador/a general.", "La sede propone; la designa la Comisión Electoral", "Propuesta: vie 9 oct. Designación: hasta el vie 16 oct"],
  ["Responsable de listas", "Busca a las personas, cuadra la cremallera y reúne aceptaciones y DNI.", "La sede", "Lun 5 oct"],
  ["Responsable de avales", "Organiza mesas, turnos y pliegos, y envía el recuento diario.", "La sede", "Lun 5 oct"],
  ["Coordinación del día D", "Recluta y forma a apoderados e interventores y organiza la recogida de resultados.", "La sede", "Antes del 2 nov"],
];

function Funciones() {
  return (
    <section className="av-bloque">
      <h2>Las personas que nombra cada sede</h2>
      <p className="av-intro">
        Cada sede, y cada provincia que se presente aunque no tenga sede, necesita estas
        funciones cubiertas. Una persona puede asumir dos, pero conviene que la responsable
        electoral no cargue también con los avales.
      </p>
      <div className="li-tabla-scroll">
        <table className="li-tabla">
          <thead>
            <tr>
              <th>Función</th>
              <th>Qué hace</th>
              <th>Quién la designa</th>
              <th>Plazo</th>
            </tr>
          </thead>
          <tbody>
            {FUNCIONES.map(([f, q, d, p]) => (
              <tr key={f}>
                <td className="li-tabla__nombre">{f}</td>
                <td>{q}</td>
                <td>{d}</td>
                <td className="li-tabla__plazo">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="av-aviso li-perfil">
        <strong>Perfil del representante de candidatura.</strong> Disponible entre el 21 de
        octubre y el 2 de noviembre, capaz de ir a la Junta Electoral Provincial (normalmente en
        la Audiencia Provincial) y de responder en menos de 24 horas a un requerimiento. Un
        descuido suyo puede costar la candidatura, y es la figura a la que menos atención se
        suele prestar.
      </p>
    </section>
  );
}

const CLAVE_TAREAS = "listas29n-tareas";

function leerMarcas(): Set<string> {
  try {
    const v = localStorage.getItem(CLAVE_TAREAS);
    return new Set(v ? (JSON.parse(v) as string[]) : []);
  } catch {
    return new Set();
  }
}

function Tareas({ hoy }: { hoy: string }) {
  const [marcas, setMarcas] = useState<Set<string>>(leerMarcas);
  const total = SEMANAS.reduce((s, w) => s + w.tareas.length, 0);
  const h = diaNumero(hoy);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_TAREAS, JSON.stringify([...marcas]));
    } catch {
      // Sin almacenamiento (modo privado, cookies bloqueadas): las marcas duran la visita.
    }
  }, [marcas]);

  function alternar(id: string) {
    setMarcas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <section className="av-bloque">
      <div className="li-tareas__cabecera">
        <h2>Tareas de la sede, semana a semana</h2>
        <span className="li-tareas__cuenta">
          {marcas.size} de {total} hechas
          {marcas.size > 0 && (
            <button className="li-borrar" onClick={() => setMarcas(new Set())}>
              Desmarcar todo
            </button>
          )}
        </span>
      </div>
      <p className="av-intro">
        Lista para la persona responsable electoral. Las marcas se guardan solo en este
        navegador: sirven para llevar el control propio, no informan a la Comisión.
      </p>
      <div className="li-semanas">
        {SEMANAS.map((s) => {
          const actual = h >= diaNumero(s.desde) && h <= diaNumero(s.hasta);
          const hechas = s.tareas.filter((t) => marcas.has(t.id)).length;
          return (
            <article key={s.id} className={`li-semana ${actual ? "actual" : ""}`}>
              <h3>
                {s.titulo}
                {actual && <span className="li-hoy">esta semana</span>}
                <small>
                  {hechas}/{s.tareas.length}
                </small>
              </h3>
              <ul>
                {s.tareas.map((t) => (
                  <li key={t.id}>
                    <label className={marcas.has(t.id) ? "hecha" : ""}>
                      <input type="checkbox" checked={marcas.has(t.id)} onChange={() => alternar(t.id)} />
                      <span>
                        {t.destacado && <strong>{t.destacado}: </strong>}
                        {t.texto}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// --- Figuras, dinero, prohibiciones y envíos -------------------------------------

const FIGURAS: [string, string, string, string, string][] = [
  ["Representante general", "Comisión Electoral", "Junta Electoral Central", "Hasta el 14 oct", "Representa al partido en todo el proceso y designa a los representantes de candidatura."],
  ["Representante de candidatura", "Representante general, a propuesta de la sede", "Junta Electoral Provincial", "Hasta el 16 oct", "Presenta la candidatura, subsana y designa apoderados e interventores."],
  ["Administrador/a general", "Comisión Electoral", "Junta Electoral Central", "Hasta el 16 oct", "Abre la cuenta electoral y responde de toda la contabilidad de campaña."],
  ["Administrador/a de candidatura", "Comisión Electoral, a propuesta de la sede", "Junta Electoral Provincial", "Hasta el 16 oct (interno; se confirmará con la Junta)", "Gestiona ingresos y gastos de la provincia."],
  ["Apoderado/a", "Representante de candidatura", "Notaría o Junta Electoral de Zona, que expide la credencial", "Como tarde el 26 nov (interno)", "Representa a la candidatura en cualquier colegio de la provincia el día de la votación."],
  ["Interventor/a", "Representante de candidatura", "Junta Electoral de Zona", "Hasta el 26 nov", "Se sienta en una mesa concreta, vota en ella y puede reclamar. Debe estar censado en la circunscripción. Hasta dos por mesa."],
];

function Figuras() {
  return (
    <section className="av-bloque">
      <h2>Las figuras electorales</h2>
      <div className="li-tabla-scroll">
        <table className="li-tabla">
          <thead>
            <tr>
              <th>Figura</th>
              <th>Quién la nombra</th>
              <th>Ante quién</th>
              <th>Plazo</th>
              <th>Qué hace</th>
            </tr>
          </thead>
          <tbody>
            {FIGURAS.map(([f, n, a, p, q]) => (
              <tr key={f}>
                <td className="li-tabla__nombre">{f}</td>
                <td>{n}</td>
                <td>{a}</td>
                <td className="li-tabla__plazo">{p}</td>
                <td>{q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dinero() {
  return (
    <article className="av-tarjeta">
      <h3>Dinero y cuenta electoral</h3>
      <ul>
        <li>
          Desde que se abre la cuenta electoral, <strong>todo gasto de campaña pasa por ella</strong>.
          Nada desde la cuenta de la sede ni en efectivo sin justificante.
        </li>
        <li>Facturas a nombre del partido, con los datos que indique el administrador/a.</li>
        <li>Toda aportación económica, identificada con nombre y DNI. Ninguna anónima.</li>
        <li>
          Cada sede se ajusta a la asignación aprobada por la Coordinadora, dentro de un techo de
          unos 32.000 € para todo el ciclo. Antes de comprometer un gasto, consultar al
          administrador/a.
        </li>
        <li>
          Las cuentas se rinden ante el Tribunal de Cuentas: un justificante perdido en una sede es
          un problema para todo el partido.
        </li>
      </ul>
    </article>
  );
}

const PROHIBIDO: [string, string][] = [
  ["Hasta el 12 nov", "Pedir expresamente el voto, poner carteles electorales o contratar anuncios en prensa, radio o medios digitales. Sí se puede presentar candidaturas y programa y recoger avales."],
  ["Desde el 24 nov", "Publicar o difundir encuestas, también en redes."],
  ["Sáb 28 nov", "Cualquier acto o mensaje de campaña."],
  ["Dom 29 nov", "Cualquier propaganda dentro de los colegios y en sus inmediaciones."],
  ["Siempre", "Usar los datos de los avales o de las listas para algo que no sea la candidatura."],
];

function Prohibido() {
  return (
    <article className="av-tarjeta li-prohibido">
      <h3>Lo que no se puede hacer</h3>
      <dl>
        {PROHIBIDO.map(([cuando, que]) => (
          <div key={cuando}>
            <dt>{cuando}</dt>
            <dd>{que}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

const ENVIOS: [string, string][] = [
  ["Nombre y contacto de la responsable electoral provincial", "Lun 5 oct"],
  ["Relación de personas disponibles para listas", "Lun 5 oct, y actualizaciones diarias"],
  ["Propuesta de cabezas de lista, representante de candidatura y administrador/a", "Vie 9 oct"],
  ["Listas completas en cremallera", "Mar 13 oct"],
  ["Aceptaciones firmadas y copias del DNI", "Lun 19 oct"],
  ["Recuento diario de avales", "Cada noche, del 6 al 26 oct"],
  ["Justificante sellado de presentación", "El mismo día de la presentación"],
  ["Relación de apoderados e interventores", "Lun 23 nov (interno)"],
  ["Resultados por mesa", "Dom 29 nov, antes de las 23:00"],
  ["Facturas y justificantes", "Lun 7 dic"],
];

function Envios() {
  return (
    <section className="av-bloque">
      <h2>Qué envía cada sede a la Comisión Electoral</h2>
      <div className="li-tabla-scroll">
        <table className="li-tabla li-envios">
          <tbody>
            {ENVIOS.map(([q, c]) => (
              <tr key={q}>
                <td>{q}</td>
                <td className="li-tabla__plazo">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="av-nota">
        Las copias de DNI y las aceptaciones nunca se suben a esta web ni se mandan por
        WhatsApp: viajan por el canal que indique la Comisión Electoral.
      </p>
    </section>
  );
}

// --- Preguntas frecuentes y fuentes ----------------------------------------------

const PREGUNTAS: [string, string][] = [
  ["¿Puedo ir en la lista de una provincia en la que no vivo?", "Sí. Basta con ser elector en España. Lo que no puedes es ir en dos listas."],
  ["¿Puedo ir al Congreso y al Senado a la vez?", "No. Hay que elegir una de las dos."],
  ["Ir en la lista, ¿me compromete a algo si salgo elegido?", "Sí: a cumplir los compromisos de los cargos públicos del partido (Reglamento Interno, arts. 90 a 92), entre ellos la dedicación exclusiva y la declaración de bienes."],
  ["¿Puedo recoger avales e ir en la lista?", "Sí. Y firmar un aval para tu propia candidatura si estás censado en esa provincia."],
  ["¿Qué pasa si alguien se echa atrás después de presentar la lista?", "Hasta la proclamación, la Junta solo admite cambios para subsanar errores. Por eso recomendamos dos suplentes en el Congreso: si alguien renuncia una vez proclamada la lista, corre el turno."],
  ["¿Qué pasa si no completamos la lista del Congreso de una provincia?", "Una lista incompleta no se admite. Si el día 13 la sede ve que no llega, tiene que avisar ese mismo día. La Coordinadora puede decidir presentar solo el Senado en esa provincia: exige menos personas (seis en la península) y allí M+J saca más del doble de votos que en el Congreso."],
  ["Soy afiliada de otra nacionalidad. ¿En qué puedo ayudar?", "En la recogida de avales, en las mesas informativas y en la campaña. No puedes ir en las listas ni firmar avales en estas elecciones."],
  ["¿Y después del 29-N?", "El 23 de mayo de 2027 hay municipales en toda España y autonómicas en varias comunidades, y ninguna de las dos pide avales a los partidos. La base de personas disponibles, los contactos con las Juntas y el inventario de material de estas semanas son el punto de partida. La Comisión Electoral enviará una guía específica después del 29-N."],
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
        Dudas sobre requisitos, documentación o plazos: Comisión Electoral, a través de la persona
        responsable electoral de tu provincia.
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
            Ley Orgánica del Régimen Electoral General (LOREG)
          </a>
          : arts. 44 bis, 46, 47, 53, 69, 72, 76, 78, 121 a 133 y 160 a 171
        </li>
        <li>
          <a href="https://www.boe.es/buscar/act.php?id=BOE-A-2024-15936" target="_blank" rel="noopener noreferrer">
            Ley Orgánica 2/2024, de representación paritaria de mujeres y hombres
          </a>
        </li>
        <li>
          <a href="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-22665" target="_blank" rel="noopener noreferrer">
            Instrucción 3/2025 de la Junta Electoral Central, sobre el art. 44 bis de la LOREG
          </a>
        </li>
        <li>Reglamento Interno de M+J, arts. 86 a 92 (Comisión Electoral, listas y cargos públicos)</li>
      </ul>
    </section>
  );
}
