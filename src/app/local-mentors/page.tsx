import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

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

      <section className="local-card-grid mentor-card-grid" aria-labelledby="mentorCategories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mentor map</p>
            <h2 id="mentorCategories">Browse by the kind of skill people can learn.</h2>
          </div>
        </div>
        {mentorCategories.map((category) => (
          <article className="card local-field-card mentor-skill-card" key={category.title}>
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
