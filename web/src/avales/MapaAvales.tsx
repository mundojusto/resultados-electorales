import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { interpolaColor } from "../colores";
import {
  ETIQUETA_SEDE,
  avalesRecogidos,
  fmt,
  minimoLegal,
  progreso,
  type ProvinciaAvales,
  type TipoSede,
} from "./avales";

export type ModoMapa = "necesarios" | "sede" | "progreso";

interface Props {
  provincias: Map<string, ProvinciaAvales>;
  modo: ModoMapa;
  seleccionada: string | null;
  onSeleccionar: (codigo: string) => void;
}

export const COLOR_SEDE: Record<TipoSede, string> = {
  constituida: "#9a5339",
  pendiente: "#e7b78a",
  sin_sede: "#efe4d8",
};

function colorDe(p: ProvinciaAvales | undefined, e: Props, max: number): string {
  if (!p) return "#f3e7da";
  if (e.modo === "sede") return COLOR_SEDE[p.sede];
  if (e.modo === "progreso") return interpolaColor(Math.min(1, progreso(p)));
  return interpolaColor(Math.sqrt(minimoLegal(p.censo) / max));
}

function estiloDe(feature: any, e: Props): L.PathOptions {
  const cod = feature.properties.cod_prov as string;
  const p = e.provincias.get(cod);
  let max = 1;
  for (const q of e.provincias.values()) max = Math.max(max, minimoLegal(q.censo));
  const sel = e.seleccionada === cod;
  // Tras la decisión de la Coordinadora, las provincias descartadas se atenúan.
  const descartada = p?.seleccionada === false;
  return {
    fillColor: colorDe(p, e, max),
    fillOpacity: descartada ? 0.25 : 0.9,
    weight: sel ? 3 : 0.6,
    color: sel ? "#3d2c24" : "#d8c3b2",
  };
}

function tooltipDe(feature: any, e: Props): string {
  const p = e.provincias.get(feature.properties.cod_prov as string);
  if (!p) return feature.properties.name;
  const r = avalesRecogidos(p);
  const linea =
    e.modo === "sede"
      ? ETIQUETA_SEDE[p.sede]
      : e.modo === "progreso"
        ? r == null
          ? "Sin recuento todavía"
          : `${fmt(r)} avales · ${Math.round(progreso(p) * 100)} % del objetivo`
        : `${fmt(minimoLegal(p.censo))} avales mínimos`;
  return `<strong>${p.provincia}</strong><br/>${linea}`;
}

export function MapaAvales(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.GeoJSON | null>(null);
  const estado = useRef<Props>(props);
  estado.current = props;

  useEffect(() => {
    if (!ref.current || mapaRef.current) return;
    const mapa = L.map(ref.current, {
      attributionControl: false,
      zoomControl: true,
      zoomSnap: 0.25,
      minZoom: 4,
      maxZoom: 9,
    });
    mapaRef.current = mapa;

    fetch(`${import.meta.env.BASE_URL}geo/provincias.geojson`)
      .then((r) => r.json())
      .then((geo) => {
        if (!mapaRef.current) return;
        const capa = L.geoJSON(geo, {
          style: (f) => estiloDe(f, estado.current),
          onEachFeature: (feature, layer) => {
            layer.on({
              mouseover: (ev) =>
                (ev.target as L.Path).setStyle({ weight: 2, color: "#9a5339" }),
              mouseout: () => capaRef.current?.resetStyle(layer),
              click: () => estado.current.onSeleccionar(feature.properties.cod_prov),
            });
            layer.bindTooltip(() => tooltipDe(feature, estado.current), { sticky: true });
          },
        }).addTo(mapa);
        capaRef.current = capa;
        mapa.fitBounds(capa.getBounds(), { padding: [10, 10] });
      });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      capaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    capaRef.current?.setStyle((f) => estiloDe(f, estado.current));
  }, [props.provincias, props.modo, props.seleccionada]);

  return <div className="mapa mapa--avales" ref={ref} />;
}
