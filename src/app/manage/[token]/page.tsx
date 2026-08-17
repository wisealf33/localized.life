import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { removeManagedLocalSubmission, updateManagedLocalSubmission } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { hashSecret } from "@/lib/tokens";
import type { LocalSubmission } from "@/lib/types";

export const metadata: Metadata = {
  title: "Manage Localized.life submission",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ updated?: string; removed?: string }>;
};

const areaLabels: Record<LocalSubmission["submission_area"], string> = {
  market: "Local Market",
  event: "Local Events",
  service: "Local Services",
  mentor: "Local Mentors",
};

async function getSubmission(token: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("local_submissions")
    .select("*")
    .eq("manage_token_hash", hashSecret(token))
    .single();
  if (error || !data) return null;
  return data as LocalSubmission;
}

export default async function ManageLocalizedSubmissionPage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const submission = await getSubmission(token);
  if (!submission) notFound();

  const isRemoved = query.removed || submission.status === "rejected";

  return (
    <main className="page narrow">
      <SiteHeader />
      <p className="eyebrow">Private manage link</p>
      <h1>Manage your {areaLabels[submission.submission_area]} submission</h1>
      <p className="lede">
        This private link lets you edit or remove the submission. Keep it private because anyone with the link can make
        changes.
      </p>

      {query.updated ? <p className="notice good">Saved. Your updated submission has been received for review.</p> : null}
      {isRemoved ? (
        <section className="panel">
          <h2>Submission removed</h2>
          <p className="muted">This submission is no longer active or publicly available.</p>
        </section>
      ) : (
        <section className="panel">
          <form action={updateManagedLocalSubmission} className="form">
            <input type="hidden" name="manage_token" value={token} />
            <input type="hidden" name="submission_area" value={submission.submission_area} />
            <label>
              Title
              <input name="title" required defaultValue={submission.title} />
            </label>
            <div className="grid two">
              <label>
                Category
                <input name="category" defaultValue={submission.category || ""} />
              </label>
              <label>
                Website or social link
                <input name="website_url" defaultValue={submission.website_url || ""} placeholder="https://..." />
              </label>
            </div>
            <div className="grid two">
              <label>
                City
                <input name="city" defaultValue={submission.city || ""} />
              </label>
              <label>
                State
                <input name="state" defaultValue={submission.state || ""} maxLength={2} />
              </label>
            </div>
            <div className="grid two">
              <label>
                Your name
                <input name="name" defaultValue={submission.name || ""} />
              </label>
              <label>
                Public contact, if you want it shown later
                <input name="contact" defaultValue={submission.contact || ""} />
              </label>
            </div>
            <label>
              Email for private manage link
              <input name="submitter_email" type="email" required defaultValue={submission.submitter_email || ""} />
            </label>
            <label>
              Description
              <textarea name="description" rows={7} required defaultValue={submission.description} />
            </label>
            <button className="button primary" type="submit">
              Save changes
            </button>
          </form>
          <form action={removeManagedLocalSubmission} className="inline-form danger-form">
            <input type="hidden" name="manage_token" value={token} />
            <button className="button secondary danger-button" type="submit">
              Remove this submission
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
