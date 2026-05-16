import { categoryOptions } from "@/lib/format";
import type { Sale } from "@/lib/types";
import { ScheduleFields } from "./ScheduleFields";

type SaleFormProps = {
  action: (formData: FormData) => Promise<void>;
  sale?: Sale;
  token?: string;
  admin?: boolean;
};

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

      <ScheduleFields sale={sale} />

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
