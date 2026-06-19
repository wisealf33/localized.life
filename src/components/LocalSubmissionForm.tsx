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
  emailStatus?: string;
  manageToken?: string;
  ctaLabel?: string;
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
  emailStatus,
  manageToken,
  ctaLabel = "Open submission form",
}: LocalSubmissionFormProps) {
  const managePath = manageToken ? `/manage/${manageToken}` : "";

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
          {emailStatus === "sent" ? (
            <p>We emailed your private manage link. Save that email so you can edit or remove the submission later.</p>
          ) : managePath ? (
            <p>
              Email is not configured yet, so save this private manage link for now:{" "}
              <Link className="text-link" href={managePath}>
                open manage link
              </Link>
            </p>
          ) : null}
          <Link className="button compact-button" href={returnPath}>
            Back to page
          </Link>
        </div>
      ) : (
        <details className="submission-details">
          <summary>
            <span>
              <strong>{ctaLabel}</strong>
              <small>No account needed. We email you a private manage link.</small>
            </span>
            <span className="summary-button">
              <span className="summary-button-closed">Open form</span>
              <span className="summary-button-open">Close form</span>
            </span>
          </summary>
          <form action={submitLocalSubmission} className="form submission-form">
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
                Public contact, if you want it shown later
                <input name="contact" placeholder="Email, phone, social link, or leave blank" />
              </label>
            </div>
            <label>
              Email for private manage link
              <input name="submitter_email" type="email" required placeholder="you@example.com" />
              <span className="helper">We email the private edit/remove link here. No account is created.</span>
            </label>
            <label>
              {descriptionLabel}
              <textarea name="description" rows={6} placeholder={descriptionPlaceholder} required />
            </label>
            <button className="button primary" type="submit">
              Submit for review
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
