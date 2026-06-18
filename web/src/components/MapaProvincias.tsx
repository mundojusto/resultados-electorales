import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FilaAgregada, Metrica } from "../types";
import { colorPara, maxValor } from "../colores";

interface Props {
  valores: Map<string, FilaAgregada>;
  provinciaComunidad: Map<string, string>;
  metrica: Metrica;
  comunidadSel: string | null;
  provinciaSel: number | null;
  onSelectProvincia: (codigo: number, comunidad: string) => void;
}

type Estado = Props;

function estiloDe(feature: any, e: Estado): L.PathOptions {
  const cod = feature.properties.cod_prov as string;
  const fila = e.valores.get(cod);
  const max = maxValor(e.valores.values(), e.metrica);
  const seleccionada = e.provinciaSel != null && Number(cod) === e.provinciaSel;
  const enComunidad =
    !e.comunidadSel || e.provinciaComunidad.get(cod) === e.comunidadSel;
  return {
    fillColor: colorPara(fila, e.metrica, max),
    fillOpacity: enComunidad ? 0.9 : 0.2,
    weight: seleccionada ? 3 : 0.6,
    color: seleccionada ? "#765043" : "#d8c3b2",
  };
}

function tooltipDe(feature: any, e: Estado): string {
  const cod = feature.properties.cod_prov as string;
  const fila = e.valores.get(cod);
  const nombre = fila?.nombre ?? feature.properties.name ?? cod;
  const votos = fila?.votos_partido ?? 0;
  const pct = fila ? fila.porcentaje.toFixed(3) : "0";
  return `<strong>${nombre}</strong><br/>${votos.toLocaleString("es-ES")} votos · ${pct}%`;
}

export function MapaProvincias(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.GeoJSON | null>(null);
  // Estado actual accesible desde los callbacks de Leaflet sin recrear la capa.
  const estado = useRef<Props>(props);
  estado.current = props;

  useEffect(() => {
    if (!ref.current || mapaRef.current) return;
    const mapa = L.map(ref.current, {
      attributionControl: false,
      zoomControl: true,
      minZoom: 4,
      maxZoom: 9,
    });
    mapaRef.current = mapa;

    fetch(`${import.meta.env.BASE_URL}geo/provincias.geojson`)
      .then((r) => r.json())
      .then((geo) => {
        const capa = L.geoJSON(geo, {
          style: (f) => estiloDe(f, estado.current),
          onEachFeature: (feature, layer) => {
            layer.on({
              mouseover: (ev) =>
                (ev.target as L.Path).setStyle({ weight: 2, color: "#9a5339" }),
              mouseout: () => capaRef.current?.resetStyle(layer),
              click: () => {
                const cod = Number(feature.properties.cod_prov);
                const com =
                  estado.current.provinciaComunidad.get(feature.properties.cod_prov) ?? "";
                estado.current.onSelectProvincia(cod, com);
              },
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

  // Re-aplica estilos al cambiar valores, métrica o selección.
  useEffect(() => {
    capaRef.current?.setStyle((f) => estiloDe(f, estado.current));
  }, [props.valores, props.metrica, props.comunidadSel, props.provinciaSel]);

  return <div className="mapa" ref={ref} />;
}
