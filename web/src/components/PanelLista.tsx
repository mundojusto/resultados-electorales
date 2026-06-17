import type { FilaAgregada, Metrica, Nivel } from "../types";

interface Props {
  nivel: Nivel;
  filas: FilaAgregada[];
  metrica: Metrica;
  onSeleccionar: (fila: FilaAgregada) => void;
}

const TITULOS: Record<Nivel, string> = {
  comunidad: "Comunidades autónomas",
  provincia: "Provincias",
  municipio: "Municipios",
};

export function PanelLista({ nivel, filas, metrica, onSeleccionar }: Props) {
  const seleccionable = nivel !== "municipio";
  const totalVotos = filas.reduce((s, f) => s + f.votos_partido, 0);

  return (
    <div className="panel-lista">
      <div className="panel-lista__cabecera">
        <h2>{TITULOS[nivel]}</h2>
        <span className="contador">{filas.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>{nivel === "comunidad" ? "Comunidad" : nivel === "provincia" ? "Provincia" : "Municipio"}</th>
            <th className="num">Votos M+J</th>
            <th className="num">% válidos</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              key={f.id}
              className={seleccionable ? "fila-link" : undefined}
              onClick={seleccionable ? () => onSeleccionar(f) : undefined}
            >
              <td>{f.nombre}</td>
              <td className={`num ${metrica === "votos" ? "destacado" : ""}`}>
                {f.votos_partido.toLocaleString("es-ES")}
              </td>
              <td className={`num ${metrica === "porcentaje" ? "destacado" : ""}`}>
                {f.porcentaje.toFixed(3)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{totalVotos.toLocaleString("es-ES")}</td>
            <td className="num"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
