import Link from "next/link";
import { submitLocalSubmission } from "@/lib/actions";
import type { LocalSubmissionArea } from "@/lib/types";

type LocalSubmissionFormProps = {
  area: LocalSubmissionArea;
  title: string;
  eyebrow: string;
  description: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  returnPath: string;
  submitted?: boolean;
};

export function LocalSubmissionForm({
  area,
  title,
  eyebrow,
  description,
  categoryLabel,
  categoryPlaceholder,
  titleLabel,
  titlePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  returnPath,
  submitted = false,
}: LocalSubmissionFormProps) {
  return (
    <section className="panel local-submit-panel" id="submit">
      <div className="submit-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>

      {submitted ? (
        <div className="notice good stack">
          <h3>Submitted for review</h3>
          <p>Thanks. This is saved in the admin queue so it can be reviewed before anything is published.</p>
          <Link className="button compact-button" href={returnPath}>
            Back to page
          </Link>
        </div>
      ) : (
        <form action={submitLocalSubmission} className="form">
          <input type="hidden" name="submission_area" value={area} />
          <input type="hidden" name="return_path" value={returnPath} />
          <label>
            {titleLabel}
            <input name="title" placeholder={titlePlaceholder} required />
          </label>
          <div className="grid two">
            <label>
              {categoryLabel}
              <input name="category" placeholder={categoryPlaceholder} />
            </label>
            <label>
              Website or social link
              <input name="website_url" placeholder="Optional link" />
            </label>
          </div>
          <div className="grid two">
            <label>
              City
              <input name="city" placeholder="Peotone" />
            </label>
            <label>
              State
              <input name="state" placeholder="IL" maxLength={2} />
            </label>
          </div>
          <div className="grid two">
            <label>
              Your name
              <input name="name" placeholder="Optional" />
            </label>
            <label>
              Contact
              <input name="contact" placeholder="Email or phone, optional" />
            </label>
          </div>
          <label>
            {descriptionLabel}
            <textarea name="description" rows={6} placeholder={descriptionPlaceholder} required />
          </label>
          <button className="button primary" type="submit">
            Submit for review
          </button>
        </form>
      )}
    </section>
  );
}
