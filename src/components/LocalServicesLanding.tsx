"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Armchair,
  ArrowRight,
  HouseLine,
  Laptop,
  Leaf,
  PawPrint,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";

const popularServices = [
  {
    title: "House cleaning",
    description: "Routine cleaning, deep cleaning, and recurring help",
    slug: "house-cleaning",
    tone: "blue",
    Icon: HouseLine,
  },
  {
    title: "Yard cleanup",
    description: "Mowing, weeding, mulching, leaves, and small outdoor jobs",
    slug: "yard-cleanup",
    tone: "green",
    Icon: Leaf,
  },
  {
    title: "Small repairs",
    description: "Doors, fixtures, drywall patches, and simple home fixes",
    slug: "handyman-repairs",
    tone: "blue",
    Icon: Wrench,
  },
  {
    title: "Furniture assembly",
    description: "Beds, shelves, tables, and storage pieces",
    slug: "furniture-assembly",
    tone: "green",
    Icon: Armchair,
  },
  {
    title: "Pet care",
    description: "Drop-ins, walks, feeding, and basic care",
    slug: "pet-care-dog-walking",
    tone: "blue",
    Icon: PawPrint,
  },
  {
    title: "Tech help",
    description: "Devices, Wi-Fi, printers, and everyday troubleshooting",
    slug: "local-tech-help",
    tone: "green",
    Icon: Laptop,
  },
];

export function LocalServicesLanding() {
  return (
    <>
      <section className="services-guided-hero" aria-labelledby="servicesHeroTitle">
        <div className="services-hero-copy">
          <h1 id="servicesHeroTitle">What can a neighbor help you with?</h1>
          <p>Tell us what needs doing. We&apos;ll help arrange the right local help.</p>
          <div className="services-hero-actions">
            <Link className="button primary" href="#service-intake">
              Get started
            </Link>
            <Link className="services-offer-link" href="#submit">
              I offer local services
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </Link>
          </div>
        </div>

        <form action="/local-services/request" className="service-intake-card" id="service-intake" method="get">
          <p>Describe your need in a few words and we&apos;ll guide you.</p>
          <label>
            What do you need help with?
            <input name="need" placeholder="Example: House cleaning, small repair, dog walking..." required />
          </label>
          <label>
            Where are you?
            <input name="city" defaultValue="Peotone, IL 60468" required />
          </label>
          <label>
            When do you need it?
            <select defaultValue="" name="timeline" required>
              <option value="" disabled>
                Choose timing
              </option>
              <option value="As soon as possible">As soon as possible</option>
              <option value="This week">This week</option>
              <option value="This weekend">This weekend</option>
              <option value="Next week">Next week</option>
              <option value="Flexible">I&apos;m flexible</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Ask for local help
          </button>
        </form>

        <div className="services-hero-image">
          <Image
            alt="Two neighbors assembling wall shelves together in a home"
            fill
            priority
            sizes="(max-width: 820px) 100vw, 34vw"
            src="/assets/local-services-hero-v3.png"
          />
        </div>
      </section>

      <section className="popular-help" aria-labelledby="popularHelpTitle">
        <h2 id="popularHelpTitle">Popular help nearby</h2>
        <div className="popular-help-list">
          {popularServices.map(({ title, description, slug, tone, Icon }) => (
            <Link className="popular-help-row" href={`/local-services/request?service=${slug}`} key={slug}>
              <span className={`popular-help-icon ${tone}`}>
                <Icon aria-hidden="true" size={24} weight="regular" />
              </span>
              <strong>{title}</strong>
              <span>{description}</span>
              <ArrowRight aria-hidden="true" className="popular-help-arrow" size={20} weight="bold" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function ServicesPrivacyNote() {
  return (
    <div className="services-privacy-note services-privacy-note-bottom">
      <ShieldCheck aria-hidden="true" size={28} weight="regular" />
      <p>
        <strong>Your contact details stay private.</strong>{" "}
        We only share them when it&apos;s time to connect.
      </p>
    </div>
  );
}
