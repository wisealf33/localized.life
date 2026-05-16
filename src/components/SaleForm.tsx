import { categoryOptions } from "@/lib/format";
import type { Sale } from "@/lib/types";

type SaleFormProps = {
  action: (formData: FormData) => Promise<void>;
  sale?: Sale;
  token?: string;
  admin?: boolean;
};

const scheduleRows = [0, 1, 2, 3, 4];

function localDateValue(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function localTimeValue(value?: string, fallback = "08:00") {
  if (!value) return fallback;
  return value.slice(11, 16) || fallback;
}

export function SaleForm({ action, sale, token, admin = false }: SaleFormProps) {
  return (
    <form action={action} className="form">
      {token ? <input type="hidden" name="manage_token" value={token} /> : null}

      <label>
        Sale title
        <input name="title" required defaultValue={sale?.title} placeholder="Saturday garage sale" />
      </label>

      <label>
        Street address
        <input name="address_line" required defaultValue={sale?.address_line} placeholder="123 Main St" />
      </label>

      <div className="grid two">
        <label>
          City
          <input name="city" required defaultValue={sale?.city} />
        </label>
        <label>
          State
          <input name="state" required defaultValue={sale?.state} maxLength={2} placeholder="TX" />
        </label>
      </div>

      <label>
        ZIP code
        <input name="zip" required defaultValue={sale?.zip} inputMode="numeric" />
      </label>

      <fieldset className="schedule-fieldset">
        <legend>Sale days and hours</legend>
        <p className="helper">Add each sale day separately. Times default to common garage sale hours.</p>
        <div className="schedule-grid">
          <span>Date</span>
          <span>Starts</span>
          <span>Ends</span>
          {scheduleRows.map((row) => (
            <div className="schedule-row" key={row}>
              <input
                name={`schedule_date_${row}`}
                aria-label={`Sale date ${row + 1}`}
                type="date"
                required={row === 0}
                defaultValue={row === 0 ? localDateValue(sale?.starts_at) : ""}
              />
              <input
                name={`schedule_start_${row}`}
                aria-label={`Start time ${row + 1}`}
                type="time"
                defaultValue={row === 0 ? localTimeValue(sale?.starts_at) : "08:00"}
              />
              <input
                name={`schedule_end_${row}`}
                aria-label={`End time ${row + 1}`}
                type="time"
                defaultValue={row === 0 ? localTimeValue(sale?.ends_at, "14:00") : "14:00"}
              />
            </div>
          ))}
        </div>
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

      <fieldset>
        <legend>Categories</legend>
        <div className="chips">
          {categoryOptions.map((category) => (
            <label className="check" key={category}>
              <input
                type="checkbox"
                name="categories"
                value={category}
                defaultChecked={sale?.categories?.includes(category)}
              />
              {category}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Description
        <textarea name="description" rows={5} defaultValue={sale?.description || ""} />
      </label>

      {sale ? (
        <label>
          Status
          <select name="status" defaultValue={sale.status}>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="ended">Ended</option>
          </select>
        </label>
      ) : null}

      {admin ? (
        <>
          <label>
            Raw source text
            <textarea name="raw_source_text" rows={7} placeholder="Paste the public post, flyer text, or tip here." />
          </label>
          <label>
            Source URL or note
            <input name="source_url" placeholder="Optional private admin reference" />
          </label>
          <label>
            Admin notes
            <textarea name="source_notes" rows={3} />
          </label>
        </>
      ) : null}

      <button className="button primary" type="submit">
        {sale ? "Save changes" : admin ? "Publish community-added listing" : "Create listing"}
      </button>
    </form>
  );
}
