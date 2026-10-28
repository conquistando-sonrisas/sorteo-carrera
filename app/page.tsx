
"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import "./globals.css";

type SheetData = {
  name: string;
  headers: string[];
  rows: string[][];
};

type Participant = {
  id: number;
  cells: string[];
};

type Winner = Participant & {
  value: string;
  drawnAt: string;
};

function randomIndex(length: number): number {
  if (length <= 0) throw new Error("No hay participantes disponibles.");

  // Evita el sesgo de usar directamente el operador módulo.
  const range = 0x100000000;
  const limit = Math.floor(range / length) * length;
  const value = new Uint32Array(1);

  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);

  return value[0] % length;
}

function createParticipants(sheet: SheetData): Participant[] {
  return sheet.rows.map((cells, index) => ({
    id: index + 1,
    cells,
  }));
}

export default function Home() {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [column, setColumn] = useState(0);
  const [available, setAvailable] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sheet = sheets.find((item) => item.name === activeSheet);

  async function handleFile(file?: File) {
    if (!file) return;

    setError("");
    setDisplayName("");
    setWinners([]);
    setAvailable([]);
    setSheets([]);
    setActiveSheet("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const parsed: SheetData[] = workbook.SheetNames.map((name) => {
        const worksheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        const nonEmptyRows = data.filter((row) =>
          row.some((cell) => String(cell ?? "").trim() !== "")
        );

        const headers = (nonEmptyRows[0] ?? []).map(
          (cell, index) =>
            String(cell).trim() || `Columna ${index + 1}`
        );

        const rows = nonEmptyRows.slice(1).map((row) =>
          headers.map((_, index) => String(row[index] ?? "").trim())
        );

        return { name, headers, rows };
      });

      const valid = parsed.filter(
        (item) => item.headers.length > 0 && item.rows.length > 0
      );

      if (!valid.length) {
        throw new Error("No se encontraron participantes en el archivo.");
      }

      setSheets(valid);
      setActiveSheet(valid[0].name);
      setColumn(0);
      setAvailable(createParticipants(valid[0]));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo leer el archivo."
      );
    }
  }

  function changeSheet(name: string) {
    const next = sheets.find((item) => item.name === name);
    if (!next) return;

    setActiveSheet(name);
    setColumn(0);
    setAvailable(createParticipants(next));
    setWinners([]);
    setDisplayName("");
    setError("");
  }

  function drawWinner() {
    if (isDrawing || available.length === 0 || !sheet) return;

    setIsDrawing(true);
    setError("");

    const duration = 2600;
    const intervalMs = 75;
    const startedAt = Date.now();

    const animation = window.setInterval(() => {
      const candidate = available[randomIndex(available.length)];
      setDisplayName(candidate.cells[column] || "(Sin nombre)");

      if (Date.now() - startedAt >= duration) {
        window.clearInterval(animation);

        const selected = available[randomIndex(available.length)];
        const value = selected.cells[column] || "(Sin nombre)";

        const winner: Winner = {
          ...selected,
          value,
          drawnAt: new Date().toLocaleString("es-MX"),
        };

        setDisplayName(value);
        setAvailable((current) =>
          current.filter((person) => person.id !== selected.id)
        );
        setWinners((current) => [winner, ...current]);
        setIsDrawing(false);
      }
    }, intervalMs);
  }

  function exportWinners() {
    if (!sheet || winners.length === 0) return;

    const data = [
      ["Fecha del sorteo", "Participante", ...sheet.headers],
      ...winners.map((winner) => [
        winner.drawnAt,
        winner.value,
        ...winner.cells,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Ganadores");
    XLSX.writeFile(workbook, "ganadores.xlsx");
  }

  useEffect(() => {
    if (isDrawing) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }, [isDrawing])

  return (
    <main className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">
            <img
              src='/sorteo-carrera/conqui.svg'
              height={34}
              width={34} />
          </span>
          <span>SORTEO</span>
        </div>
        <span className="header-label">PARTICIPANTES</span>
      </header>

      <section className="intro">
        <p className="eyebrow">UN MOMENTO ESPECIAL</p>
        <h1>¿Quién será el ganador?</h1>
        <p className="subtitle">
          Carga tu lista, inicia el sorteo y descubre quién se lleva el premio.
        </p>
      </section>

      <section className="panel upload-panel">
        <div>
          <h2>1. Lista de participantes</h2>
          <p className="muted">
            Selecciona un archivo Excel (.xls, .xlsx) o CSV.
          </p>
        </div>

        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        <button
          className="button secondary"
          onClick={() => inputRef.current?.click()}
          disabled={isDrawing}
        >
          ↑ Cargar archivo
        </button>

        {sheet && (
          <div className="configuration">
            <label>
              Hoja del archivo
              <select
                value={activeSheet}
                onChange={(event) => changeSheet(event.target.value)}
                disabled={isDrawing}
              >
                {sheets.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Columna del participante
              <select
                value={column}
                onChange={(event) => setColumn(Number(event.target.value))}
                disabled={isDrawing}
              >
                {sheet.headers.map((header, index) => (
                  <option key={index} value={index}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {sheet && (
          <div className="stats">
            <div>
              <span className="stat-number">{sheet.rows.length}</span>
              <span className="muted">Registros cargados</span>
            </div>
            <div>
              <span className="stat-number">{available.length}</span>
              <span className="muted">Disponibles</span>
            </div>
            <div>
              <span className="stat-number">{winners.length}</span>
              <span className="muted">Ganadores</span>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </section>

      <section style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div>
          <video
            style={{ borderRadius: '15px' }}
            ref={videoRef}
            src="/sorteo-carrera/policarpo.mp4"
            data-visible={isDrawing}
            muted
            playsInline
            loop
          />
        </div>

        <section className="draw-panel" style={{ flex: 1 }}>
          <p className="eyebrow">
            {isDrawing ? "EL DESTINO ESTÁ DECIDIENDO..." : "ES HORA DEL SORTEO"}
          </p>

          <div
            className={`winner-display ${isDrawing ? "shuffling" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="trophy">🏆</span>
            <h2>
              {displayName ||
                (sheet ? "¿Quién ganará?" : "Carga tu lista para comenzar")}
            </h2>
            <p>
              {isDrawing
                ? "Mucha suerte..."
                : displayName
                  ? "¡Felicidades! Tenemos un ganador."
                  : "El siguiente ganador podría ser tú."}
            </p>
          </div>

          <button
            className="button primary draw-button"
            onClick={drawWinner}
            disabled={!sheet || available.length === 0 || isDrawing}
          >
            {isDrawing
              ? "Sorteando..."
              : available.length === 0 && sheet
                ? "Todos los participantes han ganado"
                : "Elegir ganador"}
          </button>

          <p className="muted note">
            Cada ganador se retira de la lista para evitar repeticiones.
          </p>
        </section>
      </section>

      {sheet && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Participantes</h2>
              <p className="muted">Vista previa de los primeros registros.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {sheet.headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.slice(0, 8).map((cells, index) => {
                  const isWinner = winners.some(
                    (winner) => winner.id === index + 1
                  );

                  return (
                    <tr key={index}>
                      {sheet.headers.map((_, colIndex) => (
                        <td key={colIndex}>
                          {cells[colIndex] || "—"}
                        </td>
                      ))}
                      <td>
                        <span className={isWinner ? "status winner-status" : "status"}>
                          {isWinner ? "Ganador" : "Disponible"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sheet.rows.length > 8 && (
            <p className="muted note">
              Se muestran 8 de {sheet.rows.length} registros.
            </p>
          )}
        </section>
      )}

      {winners.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Historial de ganadores</h2>
              <p className="muted">
                {winners.length} ganador(es) seleccionado(s).
              </p>
            </div>
            <button className="button secondary" onClick={exportWinners}>
              ↓ Exportar Excel
            </button>
          </div>

          <ol className="winner-list">
            {winners.map((winner, index) => (
              <li key={`${winner.id}-${winner.drawnAt}`}>
                <span className="winner-number">
                  {winners.length - index}
                </span>
                <div className="winner-info">
                  <strong>{winner.value}</strong>
                  <span className="muted">{winner.drawnAt}</span>
                </div>
                <span className="medal">🏆</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer>
        Sorteo de participantes · Procesamiento local en tu navegador
      </footer>
    </main>
  );
}
