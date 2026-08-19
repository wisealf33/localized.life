import Link from "next/link";
import { localServices, serviceOptionField, serviceRadiusOptions, serviceWantedOptionField } from "@/lib/localServices";

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
  skills?: string[] | null;
  services_wanted?: string[] | null;
  services_offered?: string | null;
  help_wanted?: string | null;
  availability_notes?: string | null;
  transportation_notes?: string | null;
  accessibility_notes?: string | null;
};

type Props = {
  person?: PersonProfileValue;
  includePrimaryEmail?: boolean;
  manageOwnCalendar?: boolean;
  intro?: string;
  intake?: boolean;
};

export function PersonProfileFields({
  person = {},
  includePrimaryEmail = true,
  manageOwnCalendar = false,
  intro,
  intake = false,
}: Props) {
  const selectedServices = new Set(
    (person.skills || []).map((value) => value.trim().toLocaleLowerCase()),
  );
  const selectedServicesWanted = new Set(
    (person.services_wanted || []).map((value) => value.trim().toLocaleLowerCase()),
  );

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
        <p className="person-profile-section-copy">{intake ? "Add at least a primary phone number or primary email. Contact details are protected by system access rules." : "Contact details are shown only to people whose system role and network relationship allow access."}</p>
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
        <p className="person-profile-section-copy">The exact address is protected by system access rules. Structured fields support distance and map tools.</p>
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
        <legend>Connecting and matching</legend>
        <p className="person-profile-section-copy">These details can support relevant introductions without treating people as only customers or providers.</p>
        <div>
          <span className="person-profile-control-label">Skills or services provided</span>
          <div className="person-service-options">
            {localServices.map((service) => (
              <label className="person-service-option" key={service.slug}>
                <input
                  name={serviceOptionField(service.slug)}
                  type="checkbox"
                  defaultChecked={selectedServices.has(service.slug) || selectedServices.has(service.title.toLocaleLowerCase())}
                />
                <span>{service.title}</span>
              </label>
            ))}
          </div>
          <span className="field-note">Choose every service this person is available to provide.</span>
        </div>
        <div>
          <span className="person-profile-control-label">Services or help wanted</span>
          <div className="person-service-options">
            {localServices.map((service) => (
              <label className="person-service-option" key={service.slug}>
                <input
                  name={serviceWantedOptionField(service.slug)}
                  type="checkbox"
                  defaultChecked={selectedServicesWanted.has(service.slug) || selectedServicesWanted.has(service.title.toLocaleLowerCase())}
                />
                <span>{service.title}</span>
              </label>
            ))}
          </div>
          <span className="field-note">Choose every service this person may want help with.</span>
        </div>
        <div className="grid two">
          <label>Other help or connection details<textarea name="helpWanted" rows={4} maxLength={4000} defaultValue={person.help_wanted || ""} placeholder="Add anything not covered above or details that would help with a good introduction" /></label>
          <label>Travel or service radius<select name="serviceRadiusMiles" defaultValue={person.service_radius_miles ?? ""}><option value="">Not selected</option>{serviceRadiusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        </div>
        {manageOwnCalendar ? <div className="person-availability-link"><div><strong>Availability is managed on the calendar</strong><span>Open days, closed days, and scheduled appointments stay together.</span></div><Link href="/account/calendar">Open calendar</Link></div> : null}
        <div className="grid two">
          <label>Transportation notes<textarea name="transportationNotes" rows={3} maxLength={2000} defaultValue={person.transportation_notes || ""} placeholder="Has a vehicle, needs local pickup, can deliver…" /></label>
          <label>Accessibility or accommodation notes<textarea name="accessibilityNotes" rows={3} maxLength={2000} defaultValue={person.accessibility_notes || ""} placeholder="Only add what the person wants coordinators to know" /></label>
        </div>
      </fieldset>

    </div>
  );
}
