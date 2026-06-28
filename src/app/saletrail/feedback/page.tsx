import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { submitFeedbackRequest } from "@/lib/actions";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ submitted?: string; request_type?: string; page_url?: string; message?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Request a feature or report a bug | SaleTrail",
  description: "Send SaleTrail feedback, request a feature, or report something that needs fixing.",
  path: "/saletrail/feedback",
  image: "/og/default-saletrail.jpg",
});

export default async function FeedbackPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestType =
    params.request_type === "bug" || params.request_type === "general" || params.request_type === "feature"
      ? params.request_type
      : "feature";

  return (
    <main className="page narrow">
      <SiteHeader />
      <p className="eyebrow">SaleTrail feedback</p>
      <h1>Request a feature or report a bug</h1>
      <p className="lede">
        SaleTrail is new and moving fast. Send a feature idea, bug report, or general note so it can be reviewed in the
        admin queue.
      </p>

      {params.submitted ? (
        <section className="notice good stack">
          <h2>Feedback received</h2>
          <p>Thanks. It is now in the admin review queue.</p>
          <Link className="button primary compact-button" href="/saletrail">
            Back to listings
          </Link>
        </section>
      ) : (
        <form action={submitFeedbackRequest} className="panel form">
          <label>
            What is this about?
            <select name="request_type" defaultValue={requestType} required>
              <option value="feature">Feature request</option>
              <option value="bug">Bug report</option>
              <option value="general">General feedback</option>
            </select>
          </label>
          <label>
            Name
            <input name="name" placeholder="Optional" />
          </label>
          <label>
            Contact
            <input name="contact" placeholder="Email or phone, optional" />
          </label>
          <label>
            Page URL
            <input
              name="page_url"
              defaultValue={params.page_url || ""}
              placeholder="Paste the page where you saw the issue, optional"
            />
          </label>
          <label>
            Message
            <textarea
              name="message"
              rows={7}
              defaultValue={params.message || ""}
              placeholder="Tell me what should be added, fixed, or improved."
              required
            />
          </label>
          <button className="button primary" type="submit">
            Send feedback
          </button>
        </form>
      )}
    </main>
  );
}
