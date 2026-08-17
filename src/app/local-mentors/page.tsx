import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "@phosphor-icons/react/ssr";
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


export default async function LocalMentorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchTerm = cleanDirectorySearch(params.q);
  const visibleMentorCategories = mentorCategories.filter((category) =>
    matchesDirectorySearch(searchTerm, [category.title, category.description, ...category.examples]),
  );
  const hasFilters = Boolean(searchTerm);

  return (
    <main className="page local-page local-page-mentors public-directory-page">
      <SiteHeader active="mentors" product="Project hub" />
      <section className="hero local-hero local-hero-mentors public-directory-hero">
        <GraduationCap aria-hidden="true" className="directory-hero-icon" size={72} weight="duotone" />
        <p className="eyebrow">Learn nearby</p>
        <h1>Local Mentors</h1>
        <p className="lede">
          Find nearby people who teach useful skills—from tutoring and music to gardening, technology, trades, and
          everyday know-how.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="#mentor-search">
            Find a mentor
          </Link>
          <Link className="button" href="#submit">
            Share what you teach
          </Link>
        </div>
      </section>

      <section className="panel event-filter-panel local-directory-filter public-search-panel" id="mentor-search">
        <div>
          <h2>Find Mentors</h2>
          <p className="muted">
            Search by skill, subject, lesson type, or learning format.
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

      <section className="directory-browse-list" aria-labelledby="mentorCategories">
        <div>
          <p className="eyebrow">Browse skills</p>
          <h2 id="mentorCategories">What would you like to learn?</h2>
        </div>
        {visibleMentorCategories.length === 0 ? (
          <div className="empty local-directory-empty public-empty-state">
            <h3>No matching skills yet</h3>
            <p>Try a broader search, or share a mentor listing if you teach this skill.</p>
            <div className="toolbar">
              <Link className="button" href="/local-mentors">
                View all skills
              </Link>
              <Link className="button primary" href="#submit">
                Share what you teach
              </Link>
            </div>
          </div>
        ) : (
          <div className="directory-link-list">
            {visibleMentorCategories.map((category) => (
              <Link href={`/local-mentors?q=${encodeURIComponent(category.title)}`} key={category.title}>
                <strong>{category.title}</strong>
                <span>{category.description}</span>
                <ArrowRight aria-hidden="true" size={20} weight="bold" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <LocalSubmissionForm
        area="mentor"
        eyebrow="Submit a mentor listing"
        title="Add yourself to Local Mentors"
        description="Share the lessons, tutoring, classes, or practical skills you teach nearby. We will contact you before the listing appears publicly."
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
    </main>
  );
}
