import Link from "next/link";
import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { backlogLeads } from "@/data/backlog-leads";
import { pageMetadata } from "@/lib/seo";
import type { BacklogLead } from "@/lib/types";

type Props = {
  searchParams: Promise<{ submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Mentors: Music Lessons, Garden Skills & Hands-On Learning",
  description:
    "Find local mentors offering music lessons, garden lessons, farming skills, homestead learning, art, trades, tutoring, and other hands-on instruction.",
  path: "/local-mentors",
});

const mentorCategories = [
  {
    title: "Music & Creative Lessons",
    description: "Guitar, piano, voice, drums, art, writing, photography, and creative practice with a local teacher.",
    examples: ["Music lessons", "Art coaching", "Creative practice"],
  },
  {
    title: "Garden & Food Skills",
    description: "Gardening, seed starting, composting, preserving, cooking, foraging basics, and backyard food skills.",
    examples: ["Garden lessons", "Canning", "Composting"],
  },
  {
    title: "Farm & Homestead Learning",
    description: "Small farm skills, animal care basics, fencing, tools, seasonal chores, and practical homestead help.",
    examples: ["Farm skills", "Animal care", "Tool basics"],
  },
  {
    title: "Trades, Tech & Life Skills",
    description: "Woodworking, repairs, sewing, budgeting, computer basics, small business skills, and everyday know-how.",
    examples: ["Woodworking", "Tech help", "Sewing"],
  },
];

const mentorTypes = [
  "Music lessons",
  "Art lessons",
  "Garden lessons",
  "Farming lessons",
  "Homestead skills",
  "Cooking or preserving",
  "Trades or repair skills",
  "Technology basics",
  "Tutoring",
  "Business or life skills",
  "Other hands-on learning",
];

const mentorSignals = ["Music lessons", "Garden skills", "Farm know-how", "Creative coaching", "Life skills"];
const mentorListingPattern =
  /\b(tutor|tutoring|lesson|lessons|teacher|class|coach|coaching|mentor|music|piano|guitar|garden lesson|homestead skill)\b/i;

const mentorListings = backlogLeads.filter(
  (lead) => lead.lead_type === "services" && mentorListingPattern.test(`${lead.title} ${lead.summary} ${lead.notes}`),
);

function listingReportUrl(lead: BacklogLead) {
  const params = new URLSearchParams({
    request_type: "bug",
    page_url: `/local-mentors#${lead.id}`,
    message: `Report incorrect Local Mentor listing information for: ${lead.title}`,
  });
  return `/saletrail/feedback?${params.toString()}`;
}

function listingSummary(lead: BacklogLead) {
  const summaries: Record<string, string> = {
    "will-county-summer-tutoring-grades-1-8-2026-06-28":
      "Summer tutoring available for grade-school students in Will County, focused on grades 1-8.",
    "romeoville-preschool-teacher-tutoring-2026-06-28":
      "Preschool teacher offering tutoring near Romeoville, with education background and tutoring experience noted.",
    "plainfield-k2-tutoring-ashley-hustafson-2026-06-28":
      "K-2 tutoring in Plainfield for reading, writing, and math, with in-person and virtual options noted.",
    "will-county-kids-music-production-class-2026-06-28":
      "Kids music production class in the Will County area, with possible online or in-person music lesson options.",
    "samuel-burns-private-music-lessons-grundy-will-2026-06-28":
      "Private music lessons available in the Grundy and Will County area, with in-person or online lesson options.",
  };
  return summaries[lead.id] || lead.summary;
}

export default async function LocalMentorsPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="page local-page local-page-mentors">
      <SiteHeader active="mentors" product="Project hub" />
      <section className="hero local-hero local-hero-mentors">
        <p className="eyebrow">Learn nearby</p>
        <h1>Local Mentors</h1>
        <p className="lede">
          Find people nearby who teach useful skills one-on-one or in small settings: music, gardening, farming,
          homestead skills, trades, creative practice, tutoring, and practical know-how.
        </p>
      </section>

      <section className="local-signal-strip" aria-label="Local Mentors highlights">
        {mentorSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </section>

      <LocalSubmissionForm
        area="mentor"
        eyebrow="Submit a mentor listing"
        title="Add yourself to Local Mentors"
        description="Use this if you teach lessons, mentor practical skills, offer coaching, or help people learn something hands-on nearby. This can be in your home, their home, a garden, a workshop, a farm, online, or another agreed setting."
        categoryLabel="What do you teach?"
        categoryPlaceholder="Choose a mentor category"
        categoryOptions={mentorTypes}
        categoryHelper="Pick the closest fit. You can explain the details, location, and format below."
        titleLabel="Mentor listing title"
        titlePlaceholder="Guitar lessons, backyard garden coaching, farm skills, sewing basics..."
        descriptionLabel="Tell learners what you offer"
        descriptionPlaceholder="Describe what you teach, who it is for, where lessons happen, whether you work with beginners, typical session format, and how people should contact you."
        contactLabel="Public contact method (optional)"
        contactPlaceholder="Phone, email, website, studio page, or social link"
        contactHelper="These public contact details may be shown on an approved listing."
        manageEmailHelper="This email stays private and is used only to send your edit/remove link."
        returnPath="/local-mentors"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Post a mentor listing"
      />

      <section className="panel stack" aria-labelledby="localMentorListings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local Mentor listings</p>
            <h2 id="localMentorListings">People teaching lessons and skills nearby.</h2>
          </div>
        </div>
        {mentorListings.length === 0 ? <p className="muted">No Local Mentor listings yet.</p> : null}
        <div className="grid two local-listing-grid">
          {mentorListings.map((listing) => (
            <article className="card local-listing-card" id={listing.id} key={listing.id}>
              <div>
                <p className="eyebrow">{listing.lead_type.replaceAll("_", " ")}</p>
                <h3>{listing.title}</h3>
                <p className="muted">{listing.area}</p>
                <p>{listingSummary(listing)}</p>
              </div>
              <div className="card-actions">
                {listing.source_url ? (
                  <a className="button primary" href={listing.source_url} target="_blank" rel="noopener noreferrer">
                    Contact / source
                  </a>
                ) : null}
                <Link className="button" href={listingReportUrl(listing)}>
                  Report incorrect info
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="local-card-grid local-browse-grid" aria-labelledby="mentorCategories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mentor map</p>
            <h2 id="mentorCategories">Browse by the kind of skill people can learn.</h2>
          </div>
        </div>
        {mentorCategories.map((category) => (
          <article className="card local-field-card local-browse-card" key={category.title}>
            <div>
              <h3>{category.title}</h3>
              <p className="muted">{category.description}</p>
            </div>
            <div className="tag-row">
              {category.examples.map((example) => (
                <span key={example}>{example}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid two local-info-grid">
        <article className="card">
          <h2>Learning, not just hiring.</h2>
          <p className="muted">
            Local Mentors is different from Local Services. A service solves a job for someone; a mentor helps someone
            learn a skill they can carry forward.
          </p>
          <div className="tag-row">
            {mentorTypes.slice(0, 8).map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Many settings can work.</h2>
          <p className="muted">
            Lessons might happen in a home, yard, garden, workshop, studio, farm, library room, community space, or
            online. The listing should make the setting and comfort level clear.
          </p>
        </article>
      </section>
    </main>
  );
}
