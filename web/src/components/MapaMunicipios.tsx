import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FilaAgregada, Metrica } from "../types";
import { colorPara, maxValor } from "../colores";

interface Props {
  codigoProvincia: number;
  valores: Map<string, FilaAgregada>; // clave: código INE (CUMUN)
  metrica: Metrica;
}

function tooltip(nombre: string, fila: FilaAgregada | undefined): string {
  const votos = fila?.votos_partido ?? 0;
  const pct = fila ? fila.porcentaje.toFixed(3) : "0";
  return `<strong>${nombre}</strong><br/>${votos.toLocaleString("es-ES")} votos · ${pct}%`;
}

export function MapaMunicipios({ codigoProvincia, valores, metrica }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.GeoJSON | null>(null);
  const estado = useRef({ valores, metrica });
  estado.current = { valores, metrica };

  // Crea el mapa una sola vez.
  useEffect(() => {
    if (!ref.current || mapaRef.current) return;
    mapaRef.current = L.map(ref.current, {
      attributionControl: false,
      minZoom: 4,
      maxZoom: 11,
    });
    return () => {
      mapaRef.current?.remove();
      mapaRef.current = null;
      capaRef.current = null;
    };
  }, []);

  // Carga el GeoJSON de la provincia cada vez que cambia.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const cod = String(codigoProvincia).padStart(2, "0");
    let cancelado = false;

    fetch(`${import.meta.env.BASE_URL}geo/municipios/${cod}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Sin geometría para la provincia ${cod}`);
        return r.json();
      })
      .then((geo) => {
        if (cancelado) return;
        capaRef.current?.remove();
        const max = maxValor(estado.current.valores.values(), estado.current.metrica);
        const capa = L.geoJSON(geo, {
          style: (f) => estilo(f, estado.current, max),
          onEachFeature: (feature, layer) => {
            const nombre = feature.properties.NMUN as string;
            const fila = estado.current.valores.get(feature.properties.CUMUN);
            layer.on({
              mouseover: (e) => (e.target as L.Path).setStyle({ weight: 1.6, color: "#765043" }),
              mouseout: () => capaRef.current?.resetStyle(layer),
            });
            layer.bindTooltip(tooltip(nombre, fila), { sticky: true });
          },
        }).addTo(mapa);
        capaRef.current = capa;
        mapa.fitBounds(capa.getBounds(), { padding: [10, 10] });
      })
      .catch(() => {
        /* provincia sin fichero: se deja el mapa vacío */
      });

    return () => {
      cancelado = true;
    };
  }, [codigoProvincia]);

  // Recolorea al cambiar valores o métrica.
  useEffect(() => {
    const max = maxValor(valores.values(), metrica);
    capaRef.current?.setStyle((f) => estilo(f, { valores, metrica }, max));
  }, [valores, metrica]);

  return <div className="mapa" ref={ref} />;
}

function estilo(
  feature: any,
  estado: { valores: Map<string, FilaAgregada>; metrica: Metrica },
  max: number,
): L.PathOptions {
  const fila = estado.valores.get(feature.properties.CUMUN);
  return {
    fillColor: colorPara(fila, estado.metrica, max),
    fillOpacity: 0.9,
    weight: 0.4,
    color: "#d8c3b2",
  };
}
