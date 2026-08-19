import { selectedServiceSlugs, serviceRadiusOptions } from "./localServices";
import { normalizePhone } from "./phone";

export const personProfileColumns = "id, personal_number, auth_user_id, display_name, first_name, middle_name, last_name, preferred_name, birth_date, email, secondary_email, phone, secondary_phone, preferred_contact_method, contact_time_preferences, address_line1, address_line2, town, state, postal_code, county, country_code, latitude, longitude, location_precision, geocoded_at, timezone, service_radius_miles, skills, services_offered, help_wanted, availability_notes, transportation_notes, accessibility_notes, profile_visibility, contact_visibility, location_visibility, directory_opt_in, matching_opt_in, how_met, private_notes, created_by_person_id, claim_status, claimed_at, created_at, updated_at" as const;

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number) {
  return cleanText(value, max) || null;
}

function email(value: unknown) {
  const next = cleanText(value, 320).toLowerCase();
  if (!next) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) throw new Error("Add a valid email address.");
  return next;
}

export function personStartDetails(body: Record<string, unknown>) {
  const firstName = cleanText(body.firstName, 80);
  const lastName = cleanText(body.lastName, 120);
  const primaryEmail = email(body.email);
  const phone = optionalText(body.phone, 60);

  if (!firstName && !lastName) throw new Error("Add at least a first name or last name.");
  if (!primaryEmail && !phone) throw new Error("Add at least a phone number or email address.");
  if (phone && !normalizePhone(phone)) throw new Error("Add a valid phone number.");

  return {
    displayName: cleanText(body.displayName, 120) || [firstName, lastName].filter(Boolean).join(" "),
    firstName,
    lastName,
    email: primaryEmail,
    phone,
    phoneNormalized: normalizePhone(phone),
  };
}

function date(value: unknown) {
  const next = cleanText(value, 10);
  if (!next) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || Number.isNaN(Date.parse(`${next}T00:00:00Z`))) {
    throw new Error("Add a valid date of birth.");
  }
  if (next > new Date().toISOString().slice(0, 10)) throw new Error("Date of birth cannot be in the future.");
  return next;
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  const next = cleanText(value, 40) as T;
  return allowed.includes(next) ? next : fallback;
}

function optionalInteger(value: unknown, minimum: number, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  if (!Number.isInteger(next) || next < minimum || next > maximum) {
    throw new Error(`Add a whole number between ${minimum} and ${maximum}.`);
  }
  return next;
}

function serviceRadius(value: unknown) {
  const next = optionalInteger(value, 0, 500);
  if (next === null) return null;
  if (!serviceRadiusOptions.some((option) => option.value === next)) {
    throw new Error("Choose a travel or service radius from the list.");
  }
  return next;
}

type ProfilePayloadOptions = {
  includePrimaryEmail?: boolean;
};

export function personProfilePayload(
  body: Record<string, unknown>,
  { includePrimaryEmail = true }: ProfilePayloadOptions = {},
) {
  const state = cleanText(body.state, 2).toUpperCase();
  const countryCode = cleanText(body.countryCode, 2).toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) throw new Error("Use a two-letter country code.");

  const payload: Record<string, unknown> = {
    first_name: optionalText(body.firstName, 80),
    middle_name: optionalText(body.middleName, 80),
    last_name: optionalText(body.lastName, 120),
    preferred_name: optionalText(body.preferredName, 120),
    birth_date: date(body.birthDate),
    secondary_email: email(body.secondaryEmail),
    phone: optionalText(body.phone, 60),
    secondary_phone: optionalText(body.secondaryPhone, 60),
    preferred_contact_method: choice(
      body.preferredContactMethod,
      ["no_preference", "email", "phone", "text"] as const,
      "no_preference",
    ),
    contact_time_preferences: optionalText(body.contactTimePreferences, 500),
    address_line1: optionalText(body.addressLine1, 240),
    address_line2: optionalText(body.addressLine2, 240),
    town: optionalText(body.town, 120),
    state: state || null,
    postal_code: optionalText(body.postalCode, 20),
    county: optionalText(body.county, 120),
    country_code: countryCode || null,
    timezone: optionalText(body.timezone, 100),
    service_radius_miles: serviceRadius(body.serviceRadiusMiles),
    skills: selectedServiceSlugs(body),
    help_wanted: optionalText(body.helpWanted, 4000),
    transportation_notes: optionalText(body.transportationNotes, 2000),
    accessibility_notes: optionalText(body.accessibilityNotes, 2000),
  };

  if (includePrimaryEmail) payload.email = email(body.email);

  return payload;
}
