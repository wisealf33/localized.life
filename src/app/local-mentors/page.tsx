import type { Metadata } from "next";
import Link from "next/link";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { cleanDirectorySearch, matchesDirectorySearch } from "@/lib/localDirectory";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ q?: string; submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Mentors: Tutoring, AI Classes, Lessons & Hands-On Learning",
  description:
    "Find local mentors offering tutoring, AI classes, music lessons, garden lessons, farming skills, homestead learning, art, trades, and other hands-on instruction.",
  path: "/local-mentors",
});

const mentorCategories = [
  {
    title: "AI, Tech & Digital Skills",
    description: "AI tutoring, prompt basics, computer help, phone setup, internet safety, spreadsheets, and practical tech confidence.",
    examples: ["AI tutor", "Computer basics", "Phone help", "Spreadsheets"],
  },
  {
    title: "Academic Tutoring",
    description: "Reading, writing, math, homeschool support, study skills, test prep, and subject help for kids, teens, or adults.",
    examples: ["Math tutor", "Reading help", "Study skills", "Homeschool support"],
  },
  {
    title: "Music & Creative Practice",
    description: "Guitar, piano, voice, drums, art, writing, photography, video, content creation, and creative coaching.",
    examples: ["Music lessons", "Art lessons", "Photography", "Writing"],
  },
  {
    title: "Garden & Food Skills",
    description: "Gardening, seed starting, composting, preserving, cooking, sourdough, canning, and backyard food skills.",
    examples: ["Garden lessons", "Canning", "Sourdough", "Composting"],
  },
  {
    title: "Farm & Homestead Learning",
    description: "Small farm skills, animal care basics, fencing, tools, seasonal chores, and practical homestead help.",
    examples: ["Farm skills", "Animal care", "Chickens", "Tool basics"],
  },
  {
    title: "Trades, Repair & Making",
    description: "Woodworking, sewing, basic repairs, tool use, simple building skills, crafting, and hands-on maker skills.",
    examples: ["Woodworking", "Sewing", "Repair basics", "Tool use"],
  },
  {
    title: "Business, Money & Work Skills",
    description: "Small business basics, bookkeeping, budgeting, selling locally, resume help, interview prep, and work readiness.",
    examples: ["Budgeting", "Bookkeeping", "Resume help", "Selling locally"],
  },
  {
    title: "Wellness, Home & Life Skills",
    description: "Meal planning, organizing, parenting skills, beginner fitness, home routines, practical planning, and everyday know-how.",
    examples: ["Meal planning", "Organizing", "Life skills", "Home routines"],
  },
];

const mentorTypes = [
  "AI tutor or AI class",
  "Computer basics",
  "Phone or device help",
  "Internet safety",
  "Spreadsheets or office skills",
  "Reading tutor",
  "Math tutor",
  "Writing tutor",
  "Homeschool support",
  "Study skills",
  "Test prep",
  "Music lessons",
  "Art lessons",
  "Photography or video",
  "Writing or storytelling",
  "Content creation",
  "Garden lessons",
  "Farming lessons",
  "Homestead skills",
  "Cooking or preserving",
  "Sourdough or baking",
  "Canning or food storage",
  "Animal care basics",
  "Trades or repair skills",
  "Woodworking or tool use",
  "Sewing or mending",
  "Budgeting or money skills",
  "Bookkeeping basics",
  "Resume or interview help",
  "Business or life skills",
  "Meal planning or home routines",
  "Other hands-on learning",
];

const mentorSignals = ["AI classes", "Tutoring", "Music lessons", "Garden skills", "Farm know-how", "Life skills"];

export default async function LocalMentorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchTerm = cleanDirectorySearch(params.q);
  const visibleMentorCategories = mentorCategories.filter((category) =>
    matchesDirectorySearch(searchTerm, [category.title, category.description, ...category.examples]),
  );
  const hasFilters = Boolean(searchTerm);

  return (
    <main className="page local-page local-page-mentors">
      <SiteHeader active="mentors" product="Project hub" />
      <section className="hero local-hero local-hero-mentors">
        <p className="eyebrow">Learn nearby</p>
        <h1>Local Mentors</h1>
        <p className="lede">
          Find people nearby who teach useful skills one-on-one, in small classes, online, or in practical local
          settings: AI, tutoring, music, gardening, farming, homestead skills, trades, creative practice, and everyday
          know-how.
        </p>
      </section>

      <section className="local-signal-strip" aria-label="Local Mentors highlights">
        {mentorSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </section>

      <section className="panel event-filter-panel local-directory-filter">
        <div>
          <h2>Find Mentors</h2>
          <p className="muted">
            Search by skill, lesson type, tutoring area, or learning format. Mentors help people learn a skill, not just
            finish a job.
          </p>
        </div>
        <form action="/local-mentors" className="event-directory-search local-directory-search" method="get">
          <label>
            Search mentors
            <input
              defaultValue={searchTerm}
              name="q"
              placeholder="Try AI class, math tutor, music, garden, sewing..."
              type="search"
            />
          </label>
          <div className="event-search-actions local-search-actions">
            <button className="button primary" type="submit">
              Search
            </button>
            {hasFilters ? (
              <Link className="button" href="/local-mentors">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        <p className="event-result-count local-result-count" aria-live="polite">
          Showing {visibleMentorCategories.length} mentor {visibleMentorCategories.length === 1 ? "category" : "categories"}
          {searchTerm ? ` for "${searchTerm}"` : ""}.
        </p>
      </section>

      <section className="panel stack" aria-labelledby="localMentorListings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local Mentor listings</p>
            <h2 id="localMentorListings">Approved mentor listings will appear here.</h2>
          </div>
        </div>
        <p className="muted">
          Mentor items found from outside sources stay private until the person is contacted, the details are clear, and
          the listing is ready to show publicly.
        </p>
      </section>

      <section className="local-card-grid local-browse-grid" aria-labelledby="mentorCategories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mentor map</p>
            <h2 id="mentorCategories">Browse by the kind of skill people can learn or teach.</h2>
          </div>
        </div>
        {visibleMentorCategories.length === 0 ? (
          <div className="empty local-directory-empty">
            <h3>No Matching Mentor Categories Yet</h3>
            <p>Try another search, clear the filter, or submit the kind of mentor listing you want to add.</p>
            <div className="toolbar">
              <Link className="button" href="/local-mentors">
                View all mentors
              </Link>
              <Link className="button primary" href="#submit">
                Post a mentor listing
              </Link>
            </div>
          </div>
        ) : (
          visibleMentorCategories.map((category) => (
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
              <div className="card-actions">
                <Link className="button primary compact-button" href={`/local-mentors?q=${encodeURIComponent(category.title)}`}>
                  Browse this
                </Link>
                <Link className="button compact-button" href="#submit">
                  Post mentor listing
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <LocalSubmissionForm
        area="mentor"
        eyebrow="Submit a mentor listing"
        title="Add yourself to Local Mentors"
        description="Use this if you teach lessons, mentor practical skills, offer tutoring, run a small class, or help people learn something useful nearby. This can be in your home, their home, a garden, a workshop, a farm, online, or another agreed setting."
        categoryLabel="What do you teach?"
        categoryPlaceholder="Choose a mentor category"
        categoryOptions={mentorTypes}
        categoryHelper="Pick the closest fit. You can explain the details, location, and format below."
        titleLabel="Mentor listing title"
        titlePlaceholder="AI basics class, math tutoring, guitar lessons, garden coaching, sewing basics..."
        descriptionLabel="Tell learners what you offer"
        descriptionPlaceholder="Describe what you teach, who it is for, where lessons happen, whether you work with beginners, session format, pricing if you want to share it, and how people should contact you."
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

      <section className="grid two local-info-grid">
        <article className="card">
          <h2>Learning, not just hiring.</h2>
          <p className="muted">
            Local Mentors is different from Local Services. A service solves a job for someone; a mentor helps someone
            learn a skill they can carry forward. A good listing should say what is taught, who it is for, where it
            happens, and whether it is one-on-one, a group class, or online.
          </p>
          <div className="tag-row">
            {mentorTypes.slice(0, 12).map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>AI classes fit here.</h2>
          <p className="muted">
            Local AI tutoring can be practical: helping people use AI for writing, planning, business tasks, school
            support, organization, research, spreadsheets, and everyday computer confidence. The listing should make the
            skill level, safety boundaries, and class format clear.
          </p>
        </article>
      </section>
    </main>
  );
}
