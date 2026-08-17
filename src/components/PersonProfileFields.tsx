export type PersonProfileValue = {
  display_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  birth_date?: string | null;
  email?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  preferred_contact_method?: string | null;
  contact_time_preferences?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  town?: string | null;
  state?: string | null;
  postal_code?: string | null;
  county?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  service_radius_miles?: number | null;
  headline?: string | null;
  bio?: string | null;
  occupation?: string | null;
  organization?: string | null;
  website_url?: string | null;
  avatar_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  abilities?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  interests?: string[] | null;
  community_roles?: string[] | null;
  certifications?: string[] | null;
  services_offered?: string | null;
  help_wanted?: string | null;
  availability_notes?: string | null;
  transportation_notes?: string | null;
  accessibility_notes?: string | null;
  profile_visibility?: string | null;
  contact_visibility?: string | null;
  location_visibility?: string | null;
  directory_opt_in?: boolean | null;
  matching_opt_in?: boolean | null;
};

type Props = {
  person?: PersonProfileValue;
  includePrimaryEmail?: boolean;
  showPrivacy?: boolean;
  intro?: string;
  intake?: boolean;
};

function listValue(value: string[] | null | undefined) {
  return value?.join(", ") || "";
}

export function PersonProfileFields({
  person = {},
  includePrimaryEmail = true,
  showPrivacy = false,
  intro,
  intake = false,
}: Props) {
  return (
    <div className="person-profile-fields">
      {intro ? <p className="person-profile-intro">{intro}</p> : null}

      <fieldset className="person-profile-section">
        <legend>Identity</legend>
        <p className="person-profile-section-copy">{intake ? "Add at least a first name or last name. Both are helpful when available." : "Keep legal and everyday names separate so the same Person record works everywhere."}</p>
        <div className="person-profile-grid person-profile-name-grid">
          <label>First name<input name="firstName" maxLength={80} defaultValue={person.first_name || ""} autoComplete="given-name" /></label>
          <label>Middle name<input name="middleName" maxLength={80} defaultValue={person.middle_name || ""} autoComplete="additional-name" /></label>
          <label>Last name<input name="lastName" maxLength={120} defaultValue={person.last_name || ""} autoComplete="family-name" /></label>
        </div>
        <div className="grid two">
          <label>Profile name<input name="displayName" required={!intake} maxLength={120} defaultValue={person.display_name || ""} autoComplete="name" /><span className="field-note">{intake ? "Optional. If blank, it is created from the first or last name." : "The name shown around Localized.life."}</span></label>
          <label>Preferred name<input name="preferredName" maxLength={120} defaultValue={person.preferred_name || ""} /><span className="field-note">What friends and coordinators should call you.</span></label>
        </div>
        <label>Date of birth<input name="birthDate" type="date" defaultValue={person.birth_date || ""} /><span className="field-note">Private and optional.</span></label>
      </fieldset>

      <fieldset className="person-profile-section">
        <legend>Contact</legend>
        <p className="person-profile-section-copy">{intake ? "Add at least a primary phone number or primary email. Contact details remain private." : "Contact details remain private unless the profile owner chooses otherwise."}</p>
        <div className="grid two">
          {includePrimaryEmail ? <label>Primary email<input name="email" type="email" maxLength={320} defaultValue={person.email || ""} autoComplete="email" /></label> : null}
          <label>Secondary email<input name="secondaryEmail" type="email" maxLength={320} defaultValue={person.secondary_email || ""} /></label>
          <label>Primary phone<input name="phone" type="tel" maxLength={60} defaultValue={person.phone || ""} autoComplete="tel" /></label>
          <label>Secondary phone<input name="secondaryPhone" type="tel" maxLength={60} defaultValue={person.secondary_phone || ""} /></label>
        </div>
        <div className="grid two">
          <label>Preferred contact method<select name="preferredContactMethod" defaultValue={person.preferred_contact_method || "no_preference"}><option value="no_preference">No preference</option><option value="email">Email</option><option value="phone">Phone call</option><option value="text">Text message</option></select></label>
          <label>Best times or contact preferences<input name="contactTimePreferences" maxLength={500} defaultValue={person.contact_time_preferences || ""} placeholder="Weekday evenings, text before calling…" /></label>
        </div>
      </fieldset>

      <fieldset className="person-profile-section">
        <legend>Home or base location</legend>
        <p className="person-profile-section-copy">The exact address is private by default. Structured fields make future distance and map tools possible.</p>
        <label>Street address<input name="addressLine1" maxLength={240} defaultValue={person.address_line1 || ""} autoComplete="address-line1" /></label>
        <label>Apartment, suite, or unit<input name="addressLine2" maxLength={240} defaultValue={person.address_line2 || ""} autoComplete="address-line2" /></label>
        <div className="person-profile-grid person-profile-location-grid">
          <label>City or town<input name="town" maxLength={120} defaultValue={person.town || ""} autoComplete="address-level2" /></label>
          <label>State<input name="state" maxLength={2} defaultValue={person.state || ""} autoComplete="address-level1" /></label>
          <label>ZIP or postal code<input name="postalCode" maxLength={20} defaultValue={person.postal_code || ""} autoComplete="postal-code" /></label>
        </div>
        <div className="person-profile-grid person-profile-location-grid">
          <label>County<input name="county" maxLength={120} defaultValue={person.county || ""} /></label>
          <label>Country code<input name="countryCode" maxLength={2} defaultValue={person.country_code || ""} autoComplete="country" placeholder="US" /></label>
          <label>Time zone<input name="timezone" maxLength={100} defaultValue={person.timezone || ""} placeholder="America/Chicago" /></label>
        </div>
      </fieldset>

      <fieldset className="person-profile-section">
        <legend>About this person</legend>
        <div className="grid two">
          <label>Short headline<input name="headline" maxLength={180} defaultValue={person.headline || ""} placeholder="Gardener, neighbor, and practical problem-solver" /></label>
          <label>Profile photo URL<input name="avatarUrl" type="url" maxLength={1000} defaultValue={person.avatar_url || ""} placeholder="https://…" /><span className="field-note">A direct upload option can use this same profile field later.</span></label>
          <label>Website<input name="websiteUrl" type="url" maxLength={1000} defaultValue={person.website_url || ""} placeholder="https://…" /></label>
        </div>
        <label>About or biography<textarea name="bio" rows={4} maxLength={4000} defaultValue={person.bio || ""} placeholder="Background, experience, community ties, and anything useful for getting to know this person" /></label>
        <div className="grid two">
          <label>Occupation or role<input name="occupation" maxLength={180} defaultValue={person.occupation || ""} /></label>
          <label>Organization or business<input name="organization" maxLength={180} defaultValue={person.organization || ""} /></label>
        </div>
        <div className="grid two">
          <label>Facebook profile<input name="facebookUrl" type="url" maxLength={1000} defaultValue={person.facebook_url || ""} placeholder="https://facebook.com/…" /></label>
          <label>Instagram profile<input name="instagramUrl" type="url" maxLength={1000} defaultValue={person.instagram_url || ""} placeholder="https://instagram.com/…" /></label>
          <label>LinkedIn profile<input name="linkedinUrl" type="url" maxLength={1000} defaultValue={person.linkedin_url || ""} placeholder="https://linkedin.com/in/…" /></label>
        </div>
        <label>What can people know you for?<textarea name="abilities" rows={3} maxLength={1000} defaultValue={person.abilities || ""} placeholder="A readable summary of practical skills, goods, lessons, or ways you help" /></label>
        <div className="grid two">
          <label>Skills<input name="skills" defaultValue={listValue(person.skills)} placeholder="Carpentry, gardening, bookkeeping" /><span className="field-note">Separate items with commas.</span></label>
          <label>Interests<input name="interests" defaultValue={listValue(person.interests)} placeholder="Local history, cooking, hiking" /><span className="field-note">Separate items with commas.</span></label>
          <label>Languages<input name="languages" defaultValue={listValue(person.languages)} placeholder="English, Spanish" /><span className="field-note">Separate items with commas.</span></label>
          <label>Community roles<input name="communityRoles" defaultValue={listValue(person.community_roles)} placeholder="Volunteer, coach, organizer" /><span className="field-note">Separate items with commas.</span></label>
        </div>
        <label>Licenses or certifications<input name="certifications" defaultValue={listValue(person.certifications)} placeholder="CPR, licensed electrician, food handler" /><span className="field-note">Separate items with commas.</span></label>
      </fieldset>

      <fieldset className="person-profile-section">
        <legend>Connecting and matching</legend>
        <p className="person-profile-section-copy">These details can support relevant introductions without treating people as only customers or providers.</p>
        <div className="grid two">
          <label>Services, goods, or help offered<textarea name="servicesOffered" rows={4} maxLength={4000} defaultValue={person.services_offered || ""} placeholder="What this person may be comfortable offering" /></label>
          <label>Help, services, or connections wanted<textarea name="helpWanted" rows={4} maxLength={4000} defaultValue={person.help_wanted || ""} placeholder="Things this person may want help finding" /></label>
        </div>
        <div className="grid two">
          <label>Availability notes<textarea name="availabilityNotes" rows={3} maxLength={2000} defaultValue={person.availability_notes || ""} placeholder="Weekends, seasonal availability, advance notice…" /></label>
          <label>Travel or service radius<input name="serviceRadiusMiles" type="number" min={0} max={500} step={1} defaultValue={person.service_radius_miles ?? ""} placeholder="Miles" /></label>
        </div>
        <div className="grid two">
          <label>Transportation notes<textarea name="transportationNotes" rows={3} maxLength={2000} defaultValue={person.transportation_notes || ""} placeholder="Has a vehicle, needs local pickup, can deliver…" /></label>
          <label>Accessibility or accommodation notes<textarea name="accessibilityNotes" rows={3} maxLength={2000} defaultValue={person.accessibility_notes || ""} placeholder="Only add what the person wants coordinators to know" /></label>
        </div>
      </fieldset>

      {showPrivacy ? (
        <fieldset className="person-profile-section person-profile-privacy">
          <legend>Privacy and discovery</legend>
          <p className="person-profile-section-copy">These preferences are saved now so future search and directory tools can respect them from the beginning.</p>
          <div className="grid two">
            <label>Who can discover the profile?<select name="profileVisibility" defaultValue={person.profile_visibility || "connections"}><option value="private">Only me and authorized coordinators</option><option value="connections">My direct connections</option><option value="public">Public profile, when available</option></select></label>
            <label>Who can see contact details?<select name="contactVisibility" defaultValue={person.contact_visibility || "private"}><option value="private">Only me and authorized coordinators</option><option value="connections">My direct connections</option></select></label>
            <label>How much location can be shown?<select name="locationVisibility" defaultValue={person.location_visibility || "town_state"}><option value="hidden">Hide my location</option><option value="town_state">City and state only</option><option value="postal_code">City, state, and ZIP code</option><option value="exact">Full address, only where explicitly supported</option></select></label>
          </div>
          <label className="person-profile-checkbox"><input name="matchingOptIn" type="checkbox" defaultChecked={person.matching_opt_in !== false} /><span><strong>Use my profile for relevant matching</strong><small>Allow skills, interests, needs, and general location to help identify useful direct connections.</small></span></label>
          <label className="person-profile-checkbox"><input name="directoryOptIn" type="checkbox" defaultChecked={person.directory_opt_in === true} /><span><strong>Include me in a future people directory</strong><small>This does not publish the profile today; it records permission for a future directory.</small></span></label>
        </fieldset>
      ) : null}
    </div>
  );
}
