"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  MapPin,
  NotePencil,
  Plus,
  UserPlus,
  UsersThree,
  XCircle,
} from "@phosphor-icons/react";
import { AccountSignIn } from "@/components/AccountSignIn";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";

type CalendarDetails = {
  id: string;
  person_id: string;
  service_address_line1: string | null;
  service_address_line2: string | null;
  service_city: string | null;
  service_state: string | null;
  service_postal_code: string | null;
  service_country_code: string;
  private_notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

type CalendarPerson = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  claim_status: "claimed" | "unclaimed";
  created_at: string;
  updated_at: string;
  calendar: CalendarDetails | null;
};

type Appointment = {
  id: string;
  calendar_person_id: string;
  person_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CalendarAvailability = {
  availability_date: string;
  status: "open" | "closed";
  updated_at: string;
};

type CalendarData = {
  person: { id: string; display_name: string };
  people: CalendarPerson[];
  appointments: Appointment[];
  availability: CalendarAvailability[];
};

type ViewState =
  | { status: "loading" }
  | { status: "config" }
  | { status: "signed-out" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CalendarData };

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthCursor(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
function cursorDate(cursor: string) {
  const [year, month] = cursor.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function visibleDays(cursor: string) {
  const first = cursorDate(cursor);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function rangeForCursor(cursor: string) {
  const days = visibleDays(cursor);
  const end = new Date(days[days.length - 1]);
  end.setDate(end.getDate() + 1);
  return { start: days[0].toISOString(), end: end.toISOString() };
}

function dateTimeInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function appointmentDefaults(selectedDay: string, appointment: Appointment | null) {
  if (appointment) {
    return { startsAt: dateTimeInput(appointment.starts_at), endsAt: dateTimeInput(appointment.ends_at) };
  }
  const start = dateFromDayKey(selectedDay);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10);
  return { startsAt: dateTimeInput(start), endsAt: dateTimeInput(end) };
}

function appointmentTime(appointment: Appointment) {
  return `${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.starts_at))}–${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.ends_at))}`;
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(
    dateFromDayKey(value),
  );
}

function serviceAddress(person: CalendarPerson | undefined) {
  if (!person?.calendar) return "";
  const details = person.calendar;
  const cityLine = [details.service_city, details.service_state].filter(Boolean).join(", ");
  const cityPostal = [cityLine, details.service_postal_code].filter(Boolean).join(" ");
  return [
    details.service_address_line1,
    details.service_address_line2,
    cityPostal,
    details.service_country_code !== "US" ? details.service_country_code : null,
  ].filter(Boolean).join(", ");
}

function isDesignPreview() {
  return process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1";
}

function designPreviewData(): CalendarData {
  const current = new Date();
  const scheduledStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 10, 0);
  const scheduledEnd = new Date(scheduledStart);
  scheduledEnd.setHours(11);
  const closedDate = new Date(current);
  closedDate.setDate(closedDate.getDate() + 2);
  return {
    person: { id: "preview-garrett", display_name: "Garrett" },
    people: [{ id: "preview-person", display_name: "Cindy Grubbs", email: null, phone: "708-935-5088", town: "Peotone", state: "IL", claim_status: "unclaimed", created_at: current.toISOString(), updated_at: current.toISOString(), calendar: { id: "preview-calendar-person", person_id: "preview-person", service_address_line1: "212 S Rathje Rd", service_address_line2: null, service_city: "Peotone", service_state: "IL", service_postal_code: "60468", service_country_code: "US", private_notes: null, status: "active", created_at: current.toISOString(), updated_at: current.toISOString() } }],
    appointments: [{ id: "preview-appointment", calendar_person_id: "preview-calendar-person", person_id: "preview-person", title: "House cleaning", starts_at: scheduledStart.toISOString(), ends_at: scheduledEnd.toISOString(), status: "scheduled", location: "212 S Rathje Rd, Peotone, IL 60468", notes: null, created_at: current.toISOString(), updated_at: current.toISOString() }],
    availability: [{ availability_date: dayKey(closedDate), status: "closed", updated_at: current.toISOString() }],
  };
}

export function AccountCalendar() {
  const today = useMemo(() => dayKey(new Date()), []);
  const [cursor, setCursor] = useState(() => monthCursor(new Date()));
  const [selectedDay, setSelectedDay] = useState(today);
  const [view, setView] = useState<ViewState>(() =>
    isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" },
  );
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<CalendarPerson | null>(null);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentPersonId, setAppointmentPersonId] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadCalendar = useCallback(async () => {
    if (isDesignPreview()) {
      setView({ status: "ready", data: designPreviewData() });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setView({ status: "config" });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setView({ status: "signed-out" });
      return;
    }

    const range = rangeForCursor(cursor);
    const params = new URLSearchParams(range);
    const response = await fetch(`/api/account/calendar?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (response.status === 401) {
      setView({ status: "missing" });
      return;
    }
    if (!response.ok) {
      setView({ status: "error", message: payload.error || "Your calendar could not be opened." });
      return;
    }
    setView({ status: "ready", data: payload as CalendarData });
  }, [cursor]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const timer = window.setTimeout(() => void loadCalendar(), 0);
    if (!supabase) return () => window.clearTimeout(timer);
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadCalendar(), 0);
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [loadCalendar]);

  async function calendarPost(body: Record<string, unknown>) {
    if (isDesignPreview()) return {} as { personId?: string; appointmentId?: string };
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getSession()) || { data: { session: null } };
    if (!data.session) throw new Error("Sign in to continue.");
    const response = await fetch("/api/account/calendar", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That calendar change could not be saved.");
    return payload as { personId?: string; appointmentId?: string };
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({
        action: "create-person",
        ...Object.fromEntries(values),
        serviceCountryCode: "US",
      });
      form.reset();
      setPersonFormOpen(false);
      setMessage("Person added. You can schedule an appointment with them now.");
      await loadCalendar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This person could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function savePersonDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPerson) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({
        action: "save-person-details",
        personId: editingPerson.id,
        serviceAddressLine1: values.get("serviceAddressLine1"),
        serviceAddressLine2: values.get("serviceAddressLine2"),
        serviceCity: values.get("serviceCity"),
        serviceState: values.get("serviceState"),
        servicePostalCode: values.get("servicePostalCode"),
        serviceCountryCode: "US",
        privateNotes: values.get("privateNotes"),
        status: "active",
      });
      setEditingPerson(null);
      setMessage("Service details saved.");
      await loadCalendar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "These service details could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({
        action: editingAppointment ? "update-appointment" : "create-appointment",
        appointmentId: editingAppointment?.id,
        personId: values.get("personId"),
        title: values.get("title"),
        startsAt: new Date(String(values.get("startsAt"))).toISOString(),
        endsAt: new Date(String(values.get("endsAt"))).toISOString(),
        status: editingAppointment?.status || "scheduled",
        availabilityDate: String(values.get("startsAt")).slice(0, 10),
        location: appointmentLocation,
        notes: values.get("notes"),
      });
      setMessage(editingAppointment ? "Appointment updated." : "Appointment added to your calendar.");
      setEditingAppointment(null);
      setAppointmentFormOpen(false);
      await loadCalendar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This appointment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setAppointmentStatus(appointment: Appointment, status: Appointment["status"]) {
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({ action: "set-appointment-status", appointmentId: appointment.id, status });
      setMessage(status === "completed" ? "Appointment marked complete." : "Appointment cancelled.");
      await loadCalendar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This appointment could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function setDayAvailability(status: CalendarAvailability["status"]) {
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({ action: "set-availability", availabilityDate: selectedDay, status });
      if (status === "closed") {
        setAppointmentFormOpen(false);
        setEditingAppointment(null);
      }
      setMessage(`${longDate(selectedDay)} is marked ${status}.`);
      await loadCalendar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Availability could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function moveMonth(amount: number) {
    const next = cursorDate(cursor);
    next.setMonth(next.getMonth() + amount);
    setCursor(monthCursor(next));
    setSelectedDay(dayKey(next));
    setEditingAppointment(null);
    setAppointmentFormOpen(false);
  }

  function goToday() {
    const now = new Date();
    setCursor(monthCursor(now));
    setSelectedDay(dayKey(now));
  }

  function openAppointment(appointment: Appointment | null, people: CalendarPerson[]) {
    const personId = appointment?.person_id || people[0]?.id || "";
    setEditingAppointment(appointment);
    setAppointmentPersonId(personId);
    setAppointmentLocation(appointment?.location || serviceAddress(people.find((person) => person.id === personId)));
    setAppointmentFormOpen(true);
  }

  if (view.status === "loading") {
    return <section className="account-loading" aria-live="polite">Opening your calendar…</section>;
  }
  if (view.status === "config") {
    return <section className="notice bad"><h2>Calendar access is not configured</h2><p>Add the Supabase browser settings for this environment.</p></section>;
  }
  if (view.status === "signed-out") {
    return <AccountSignIn title="Open your appointment calendar" returnTo="/account/calendar" />;
  }
  if (view.status === "missing") {
    return <section className="notice stack"><h2>This sign-in is not attached to a claimed profile.</h2><p>Open your private invitation first, then return to the calendar.</p></section>;
  }
  if (view.status === "error") return <section className="notice bad">{view.message}</section>;

  const { data } = view;
  const days = visibleDays(cursor);
  const currentMonth = cursorDate(cursor).getMonth();
  const activePeople = data.people.filter((person) => person.calendar?.status !== "archived");
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const availabilityByDay = new Map(data.availability.map((entry) => [entry.availability_date, entry.status]));
  const appointmentsByDay = new Map<string, Appointment[]>();
  for (const appointment of data.appointments) {
    const key = dayKey(new Date(appointment.starts_at));
    appointmentsByDay.set(key, [...(appointmentsByDay.get(key) || []), appointment]);
  }
  const selectedAppointments = appointmentsByDay.get(selectedDay) || [];
  const selectedAvailability = availabilityByDay.get(selectedDay) || "open";
  const selectedScheduledCount = selectedAppointments.filter((appointment) => appointment.status === "scheduled").length;
  const defaults = appointmentDefaults(selectedDay, editingAppointment);

  return (
    <div className="calendar-account">
      <header className="calendar-account-header">
        <div>
          <Link className="account-back-link" href="/account"><ArrowLeft /> Back to account</Link>
          <p className="eyebrow">Private workspace</p>
          <h1>Appointment calendar</h1>
          <p>Schedule any person you are connected with. Service details and appointments stay private to you.</p>
        </div>
        <div className="calendar-header-actions">
          <button className="button" type="button" onClick={() => { setPersonFormOpen((open) => !open); setEditingPerson(null); }}><UserPlus /> Add person</button>
          <button className="button primary" type="button" disabled={!activePeople.length || selectedAvailability === "closed"} onClick={() => openAppointment(null, activePeople)}><Plus /> New appointment</button>
        </div>
      </header>

      {message ? <p className="notice good account-message" aria-live="polite">{message}</p> : null}

      {personFormOpen ? (
        <section className="calendar-inline-form" aria-labelledby="add-person-title">
          <div className="account-inline-heading"><div><p className="eyebrow">One shared Person record</p><h2 id="add-person-title">Add a new person</h2><p className="muted">Required to start: a first or last name, plus a phone number or email.</p></div><button className="icon-button" type="button" aria-label="Close person form" onClick={() => setPersonFormOpen(false)}><XCircle /></button></div>
          <form className="form" onSubmit={addPerson}>
            <fieldset className="calendar-address-fields"><legend>Person identity and contact</legend><div className="person-profile-grid person-profile-name-grid"><label>First name<input name="firstName" autoComplete="given-name" /></label><label>Middle name<input name="middleName" autoComplete="additional-name" /></label><label>Last name<input name="lastName" autoComplete="family-name" /></label></div><div className="grid two"><label>Profile name <span className="muted">Optional</span><input name="displayName" autoComplete="name" /></label><label>Preferred name<input name="preferredName" /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" /></label><label>Email<input name="email" type="email" autoComplete="email" /></label><label>Secondary phone<input name="secondaryPhone" type="tel" /></label></div></fieldset>
            <fieldset className="calendar-address-fields"><legend>Service address</legend><label>Street address<input name="serviceAddressLine1" autoComplete="address-line1" /></label><label>Apartment, suite, or unit<input name="serviceAddressLine2" autoComplete="address-line2" /></label><div className="calendar-address-locality"><label>City<input name="serviceCity" autoComplete="address-level2" /></label><label>State<input name="serviceState" maxLength={2} autoComplete="address-level1" /></label><label>ZIP code<input name="servicePostalCode" inputMode="numeric" autoComplete="postal-code" /></label></div></fieldset>
            <label>Private notes<textarea name="privateNotes" rows={3} placeholder="Preferences, access details, or anything helpful before a visit" /></label>
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save person"}</button>
          </form>
        </section>
      ) : null}

      {editingPerson ? (
        <section className="calendar-inline-form" aria-labelledby="person-details-title">
          <div className="account-inline-heading"><div><p className="eyebrow">Private service details</p><h2 id="person-details-title">{editingPerson.display_name}</h2><p className="muted">Their Person identity stays shared; this address and these notes are private to your calendar.</p></div><button className="icon-button" type="button" aria-label="Close service details" onClick={() => setEditingPerson(null)}><XCircle /></button></div>
          <form className="form" onSubmit={savePersonDetails}>
            <fieldset className="calendar-address-fields"><legend>Service address</legend><label>Street address<input name="serviceAddressLine1" defaultValue={editingPerson.calendar?.service_address_line1 || ""} autoComplete="address-line1" /></label><label>Apartment, suite, or unit<input name="serviceAddressLine2" defaultValue={editingPerson.calendar?.service_address_line2 || ""} autoComplete="address-line2" /></label><div className="calendar-address-locality"><label>City<input name="serviceCity" defaultValue={editingPerson.calendar?.service_city || editingPerson.town || ""} autoComplete="address-level2" /></label><label>State<input name="serviceState" maxLength={2} defaultValue={editingPerson.calendar?.service_state || editingPerson.state || "IL"} autoComplete="address-level1" /></label><label>ZIP code<input name="servicePostalCode" inputMode="numeric" defaultValue={editingPerson.calendar?.service_postal_code || ""} autoComplete="postal-code" /></label></div></fieldset>
            <label>Private notes<textarea name="privateNotes" rows={3} defaultValue={editingPerson.calendar?.private_notes || ""} placeholder="Preferences, access details, or anything helpful before a visit" /></label>
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save service details"}</button>
          </form>
        </section>
      ) : null}

      {appointmentFormOpen ? (
        <section className="calendar-inline-form" aria-labelledby="appointment-form-title">
          <div className="account-inline-heading"><div><p className="eyebrow">{editingAppointment ? "Update schedule" : longDate(selectedDay)}</p><h2 id="appointment-form-title">{editingAppointment ? "Edit appointment" : "New appointment"}</h2></div><button className="icon-button" type="button" aria-label="Close appointment form" onClick={() => { setAppointmentFormOpen(false); setEditingAppointment(null); }}><XCircle /></button></div>
          <form className="form" key={`${editingAppointment?.id || "new"}-${selectedDay}`} onSubmit={saveAppointment}>
            <div className="grid two">
              <label>Person<select name="personId" required value={appointmentPersonId} onChange={(event) => { const personId = event.target.value; setAppointmentPersonId(personId); setAppointmentLocation(serviceAddress(peopleById.get(personId))); }}><option value="" disabled>Choose a person</option>{activePeople.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select></label>
              <label>Appointment title<input name="title" required defaultValue={editingAppointment?.title || ""} placeholder="Cleaning, lawn visit, consultation…" /></label>
            </div>
            <div className="grid two"><label>Starts<input name="startsAt" type="datetime-local" required defaultValue={defaults.startsAt} /></label><label>Ends<input name="endsAt" type="datetime-local" required defaultValue={defaults.endsAt} /></label></div>
            <div className="grid two"><label>Location<input name="location" value={appointmentLocation} onChange={(event) => setAppointmentLocation(event.target.value)} /></label><label>Private notes<input name="notes" defaultValue={editingAppointment?.notes || ""} /></label></div>
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : editingAppointment ? "Save changes" : "Add to calendar"}</button>
          </form>
        </section>
      ) : null}

      <div className="calendar-account-grid">
        <section className="calendar-board" aria-labelledby="calendar-month-title">
          <div className="calendar-toolbar">
            <div><p className="eyebrow">Schedule</p><h2 id="calendar-month-title">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(cursorDate(cursor))}</h2></div>
            <div className="calendar-navigation"><button className="button compact-button" type="button" onClick={goToday}>Today</button><button className="icon-button" type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><CaretLeft /></button><button className="icon-button" type="button" aria-label="Next month" onClick={() => moveMonth(1)}><CaretRight /></button></div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div>
          <div className="calendar-month-grid">
            {days.map((date) => {
              const key = dayKey(date);
              const appointments = appointmentsByDay.get(key) || [];
              const availability = availabilityByDay.get(key) || "open";
              return (
                <button className={["calendar-day", availability === "closed" ? "closed" : "", date.getMonth() !== currentMonth ? "outside" : "", key === selectedDay ? "selected" : "", key === today ? "today" : ""].filter(Boolean).join(" ")} type="button" key={key} onClick={() => setSelectedDay(key)}>
                  <span className="calendar-day-heading"><span className="calendar-day-number">{date.getDate()}</span>{availability === "closed" ? <span className="calendar-day-status closed">Closed</span> : null}</span>
                  <span className="calendar-day-appointments">
                    {appointments.slice(0, 3).map((appointment) => <span className={`calendar-appointment-pill ${appointment.status}`} key={appointment.id}>{new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(appointment.starts_at))} {peopleById.get(appointment.person_id)?.display_name || appointment.title}</span>)}
                    {appointments.length > 3 ? <small>+{appointments.length - 3} more</small> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-day-panel" aria-labelledby="selected-day-title">
          <div className="account-sidebar-heading"><div><p className="eyebrow">Selected day</p><h2 id="selected-day-title">{longDate(selectedDay)}</h2></div><button className="icon-button" type="button" aria-label="Add appointment on selected day" disabled={!activePeople.length || selectedAvailability === "closed"} onClick={() => openAppointment(null, activePeople)}><Plus /></button></div>
          <label className="calendar-availability-control">
            <span><strong>Availability</strong><small>{selectedAvailability === "closed" ? "Closed to new appointments" : selectedScheduledCount ? `${selectedScheduledCount} scheduled appointment${selectedScheduledCount === 1 ? "" : "s"}; remaining time is open` : "Open for appointments"}</small></span>
            <select value={selectedAvailability} disabled={busy} onChange={(event) => void setDayAvailability(event.target.value as CalendarAvailability["status"])}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          {selectedAppointments.length ? (
            <div className="calendar-agenda-list">
              {selectedAppointments.map((appointment) => {
                const person = peopleById.get(appointment.person_id);
                return (
                  <article className={`calendar-agenda-card ${appointment.status}`} key={appointment.id}>
                    <div className="calendar-agenda-heading"><div><span>{appointmentTime(appointment)}</span><h3>{appointment.title}</h3></div><span className="account-activity-status">{appointment.status}</span></div>
                    <p><UsersThree /> {person?.display_name || "Person"}</p>
                    {appointment.location ? <p><MapPin /> {appointment.location}</p> : null}
                    {appointment.notes ? <p><NotePencil /> {appointment.notes}</p> : null}
                    <div className="calendar-agenda-actions">
                      <button className="account-link-button" type="button" disabled={busy} onClick={() => openAppointment(appointment, activePeople)}>Edit</button>
                      {appointment.status === "scheduled" ? <><button className="account-link-button" type="button" disabled={busy} onClick={() => setAppointmentStatus(appointment, "completed")}><CheckCircle /> Complete</button><button className="account-link-button danger-link" type="button" disabled={busy} onClick={() => setAppointmentStatus(appointment, "cancelled")}><XCircle /> Cancel</button></> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="account-empty-list"><Clock weight="duotone" /><div><h3>No appointments</h3><p>{selectedAvailability === "closed" ? "This day is closed." : "This day is open."}</p></div></div>
          )}
        </aside>
      </div>

      <section className="calendar-customer-directory" aria-labelledby="calendar-people-title">
        <div className="account-section-heading"><div><p className="eyebrow">Your connections</p><h2 id="calendar-people-title">People available for appointments</h2></div><span>{activePeople.length} people</span></div>
        {activePeople.length ? (
          <div className="calendar-customer-list">
            {activePeople.map((person) => (
              <article className="calendar-customer-card" key={person.id}>
                <Link
                  className="calendar-person-profile-link"
                  href={`/connections/${person.id}`}
                  aria-label={`Open ${person.display_name}'s connection page`}
                >
                  <div className="account-small-avatar" aria-hidden="true"><UsersThree weight="duotone" /></div>
                  <div>
                    <h3>{person.display_name}</h3>
                    <p>{person.phone || person.email || "Contact details not added"}</p>
                    {serviceAddress(person) ? <small>{serviceAddress(person)}</small> : <small>Service address not added</small>}
                    <span className="calendar-person-open-profile">Open connection <CaretRight aria-hidden="true" /></span>
                  </div>
                </Link>
                <button className="account-link-button calendar-person-edit" type="button" onClick={() => { setEditingPerson(person); setPersonFormOpen(false); }}> {person.calendar ? "Edit service details" : "Add service details"}</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-empty-list"><CalendarBlank weight="duotone" /><div><h3>Add your first person</h3><p>Every Person can receive services, provide services, or do both.</p></div><button className="button primary compact-button" type="button" onClick={() => setPersonFormOpen(true)}>Add person</button></div>
        )}
      </section>
    </div>
  );
}
