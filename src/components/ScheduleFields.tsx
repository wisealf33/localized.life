"use client";

import { useState } from "react";
import type { Sale } from "@/lib/types";

const maxRows = 5;

function localDateValue(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function localTimeValue(value?: string, fallback = "08:00") {
  if (!value) return fallback;
  return value.slice(11, 16) || fallback;
}

export function ScheduleFields({ sale }: { sale?: Sale }) {
  const [visibleRows, setVisibleRows] = useState(1);
  const rows = Array.from({ length: maxRows }, (_, index) => index);

  return (
    <fieldset className="schedule-fieldset">
      <legend>Sale days and hours</legend>
      <p className="helper">Start with one sale day. Add another day only when the sale runs multiple days.</p>
      <div className="schedule-grid">
        <span>Date</span>
        <span>Starts</span>
        <span>Ends</span>
        {rows.map((row) => (
          <div className={row < visibleRows ? "schedule-row" : "schedule-row hidden"} key={row}>
            <input
              name={`schedule_date_${row}`}
              aria-label={`Sale date ${row + 1}`}
              type="date"
              required={row === 0}
              disabled={row >= visibleRows}
              defaultValue={row === 0 ? localDateValue(sale?.starts_at) : ""}
            />
            <input
              name={`schedule_start_${row}`}
              aria-label={`Start time ${row + 1}`}
              type="time"
              disabled={row >= visibleRows}
              defaultValue={row === 0 ? localTimeValue(sale?.starts_at) : "08:00"}
            />
            <input
              name={`schedule_end_${row}`}
              aria-label={`End time ${row + 1}`}
              type="time"
              disabled={row >= visibleRows}
              defaultValue={row === 0 ? localTimeValue(sale?.ends_at, "14:00") : "14:00"}
            />
          </div>
        ))}
      </div>
      {visibleRows < maxRows ? (
        <button className="button ghost compact-button" type="button" onClick={() => setVisibleRows(visibleRows + 1)}>
          Add another day
        </button>
      ) : null}
      <label className="check schedule-check">
        <input type="checkbox" name="schedule_uncertain" defaultChecked={sale?.sale_schedule?.includes("not confirmed")} />
        Dates or hours are not fully confirmed
      </label>
      <label>
        Schedule note
        <textarea
          name="schedule_note"
          rows={2}
          defaultValue={sale?.sale_schedule?.includes("not confirmed") ? sale.sale_schedule : ""}
          placeholder="Optional: exact day(s) and hours are not confirmed. Message the poster for details."
        />
      </label>
    </fieldset>
  );
}
