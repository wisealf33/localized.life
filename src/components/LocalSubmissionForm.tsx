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
  errorMessage?: string;
  ctaLabel?: string;
  summaryNote?: string;
  categoryOptions?: string[];
  categoryHelper?: string;
  contactLabel?: string;
  contactPlaceholder?: string;
  contactHelper?: string;
  manageEmailHelper?: string;
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
  errorMessage,
  ctaLabel = "Open submission form",
  summaryNote = "No account needed. We email you a private manage link.",
  categoryOptions,
  categoryHelper,
  contactLabel = "Public contact method (optional)",
  contactPlaceholder = "Email, phone, social link, or leave blank",
  contactHelper,
  manageEmailHelper = "This stays private and is used only to email your edit/remove link.",
}: LocalSubmissionFormProps) {
  const managePath = manageToken ? `/manage/${manageToken}` : "";
  const isServiceSubmission = area === "service";
  const hasError = Boolean(errorMessage);

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
        <details className="submission-details" open={hasError}>
          <summary>
            <span>
              <strong>{ctaLabel}</strong>
              <small>{summaryNote}</small>
            </span>
            <span className="summary-button">
              <span className="summary-button-closed">Open form</span>
              <span className="summary-button-open">Close form</span>
            </span>
          </summary>
          {errorMessage ? (
            <div className="notice bad stack" role="alert">
              <h3>Submission was not saved</h3>
              <p>{errorMessage}</p>
            </div>
          ) : null}
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
                {categoryOptions?.length ? (
                  <select name="category" defaultValue="">
                    <option value="">{categoryPlaceholder}</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name="category" placeholder={categoryPlaceholder} />
                )}
                {categoryHelper ? <span className="helper">{categoryHelper}</span> : null}
              </label>
              <label>
                Website or social link
                <input name="website_url" placeholder="Website, Facebook page, or profile link" />
              </label>
            </div>
            <div className="grid two">
              <label>
                City
                <input name="city" placeholder="Example: Chicago, Joliet, or nearby town" />
              </label>
              <label>
                State
                <input name="state" placeholder="Example: IL" maxLength={2} />
              </label>
            </div>
            {isServiceSubmission ? (
              <>
                <div className="grid two">
                  <label>
                    Service area
                    <input
                      name="service_area"
                      placeholder="Example: South suburbs, Will County, nearby towns"
                    />
                  </label>
                  <label>
                    Distance willing to travel
                    <input name="travel_distance" placeholder="Example: 10 miles, 30 minutes, countywide" />
                  </label>
                </div>
                <div className="grid two">
                  <label>
                    Your name or business name
                    <input name="name" placeholder="Name, business name, or local project" />
                  </label>
                  <label>
                    Public phone number
                    <input name="public_phone" placeholder="Phone number customers can call or text" />
                  </label>
                </div>
                <div className="grid two">
                  <label>
                    Public email address
                    <input name="public_email" type="email" placeholder="Email customers can use" />
                  </label>
                  <label>
                    Preferred contact method
                    <input name="preferred_contact" placeholder="Text first, call after 5 PM, email is best..." />
                    {contactHelper ? <span className="helper">{contactHelper}</span> : null}
                  </label>
                </div>
              </>
            ) : (
              <div className="grid two">
                <label>
                  Your name
                  <input name="name" placeholder="Optional" />
                </label>
                <label>
                  {contactLabel}
                  <input name="contact" placeholder={contactPlaceholder} />
                  {contactHelper ? <span className="helper">{contactHelper}</span> : null}
                </label>
              </div>
            )}
            <label>
              Email for private manage link
              <input name="submitter_email" type="email" required placeholder="you@example.com" />
              <span className="helper">{manageEmailHelper}</span>
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
