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

type Customer = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

type Appointment = {
  id: string;
  customer_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CalendarData = {
  person: { id: string; display_name: string };
  customers: Customer[];
  appointments: Appointment[];
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

export function AccountCalendar() {
  const today = useMemo(() => dayKey(new Date()), []);
  const [cursor, setCursor] = useState(() => monthCursor(new Date()));
  const [selectedDay, setSelectedDay] = useState(today);
  const [view, setView] = useState<ViewState>(() =>
    isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" },
  );
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadCalendar = useCallback(async () => {
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
    return payload as { customerId?: string; appointmentId?: string };
  }

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await calendarPost({
        action: "create-customer",
        displayName: values.get("displayName"),
        email: values.get("email"),
        phone: values.get("phone"),
        address: values.get("address"),
        notes: values.get("notes"),
      });
      form.reset();
      setCustomerFormOpen(false);
      setMessage("Customer added. You can schedule their first appointment now.");
      await loadCalendar();
      setAppointmentFormOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This customer could not be saved.");
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
        customerId: values.get("customerId"),
        title: values.get("title"),
        startsAt: new Date(String(values.get("startsAt"))).toISOString(),
        endsAt: new Date(String(values.get("endsAt"))).toISOString(),
        status: editingAppointment?.status || "scheduled",
        location: values.get("location"),
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

  if (view.status === "loading") {
    return <section className="account-loading" aria-live="polite">Opening your calendar…</section>;
  }
  if (view.status === "config") {
    return <section className="notice bad"><h2>Calendar access is not configured</h2><p>Add the Supabase browser settings for this environment.</p></section>;
  }
  if (view.status === "signed-out") {
    return <AccountSignIn title="Open your customer calendar" returnTo="/account/calendar" />;
  }
  if (view.status === "missing") {
    return <section className="notice stack"><h2>This sign-in is not attached to a claimed profile.</h2><p>Open your private invitation first, then return to the calendar.</p></section>;
  }
  if (view.status === "error") return <section className="notice bad">{view.message}</section>;

  const { data } = view;
  const days = visibleDays(cursor);
  const currentMonth = cursorDate(cursor).getMonth();
  const activeCustomers = data.customers.filter((customer) => customer.status === "active");
  const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const appointmentsByDay = new Map<string, Appointment[]>();
  for (const appointment of data.appointments) {
    const key = dayKey(new Date(appointment.starts_at));
    appointmentsByDay.set(key, [...(appointmentsByDay.get(key) || []), appointment]);
  }
  const selectedAppointments = appointmentsByDay.get(selectedDay) || [];
  const defaults = appointmentDefaults(selectedDay, editingAppointment);

  return (
    <div className="calendar-account">
      <header className="calendar-account-header">
        <div>
          <Link className="account-back-link" href="/account"><ArrowLeft /> Back to account</Link>
          <p className="eyebrow">Private workspace</p>
          <h1>Customer calendar</h1>
          <p>Keep customer details and appointments together. Only you can see this information.</p>
        </div>
        <div className="calendar-header-actions">
          <button className="button" type="button" onClick={() => setCustomerFormOpen((open) => !open)}><UserPlus /> Add customer</button>
          <button className="button primary" type="button" disabled={!activeCustomers.length} onClick={() => { setEditingAppointment(null); setAppointmentFormOpen(true); }}><Plus /> New appointment</button>
        </div>
      </header>

      {message ? <p className="notice good account-message" aria-live="polite">{message}</p> : null}

      {customerFormOpen ? (
        <section className="calendar-inline-form" aria-labelledby="add-customer-title">
          <div className="account-inline-heading"><div><p className="eyebrow">Customer details</p><h2 id="add-customer-title">Add an established customer</h2></div><button className="icon-button" type="button" aria-label="Close customer form" onClick={() => setCustomerFormOpen(false)}><XCircle /></button></div>
          <form className="form" onSubmit={addCustomer}>
            <div className="grid two"><label>Name<input name="displayName" required autoComplete="name" /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" /></label></div>
            <div className="grid two"><label>Email<input name="email" type="email" autoComplete="email" /></label><label>Service address<input name="address" autoComplete="street-address" /></label></div>
            <label>Private notes<textarea name="notes" rows={3} placeholder="Preferences, access details, or anything helpful before a visit" /></label>
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save customer"}</button>
          </form>
        </section>
      ) : null}

      {appointmentFormOpen ? (
        <section className="calendar-inline-form" aria-labelledby="appointment-form-title">
          <div className="account-inline-heading"><div><p className="eyebrow">{editingAppointment ? "Update schedule" : longDate(selectedDay)}</p><h2 id="appointment-form-title">{editingAppointment ? "Edit appointment" : "New appointment"}</h2></div><button className="icon-button" type="button" aria-label="Close appointment form" onClick={() => { setAppointmentFormOpen(false); setEditingAppointment(null); }}><XCircle /></button></div>
          <form className="form" key={`${editingAppointment?.id || "new"}-${selectedDay}`} onSubmit={saveAppointment}>
            <div className="grid two">
              <label>Customer<select name="customerId" required defaultValue={editingAppointment?.customer_id || activeCustomers[0]?.id || ""}><option value="" disabled>Choose a customer</option>{activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name}</option>)}</select></label>
              <label>Appointment title<input name="title" required defaultValue={editingAppointment?.title || ""} placeholder="Cleaning, lawn visit, consultation…" /></label>
            </div>
            <div className="grid two"><label>Starts<input name="startsAt" type="datetime-local" required defaultValue={defaults.startsAt} /></label><label>Ends<input name="endsAt" type="datetime-local" required defaultValue={defaults.endsAt} /></label></div>
            <div className="grid two"><label>Location<input name="location" defaultValue={editingAppointment?.location || customersById.get(editingAppointment?.customer_id || activeCustomers[0]?.id)?.address || ""} /></label><label>Private notes<input name="notes" defaultValue={editingAppointment?.notes || ""} /></label></div>
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
              return (
                <button className={["calendar-day", date.getMonth() !== currentMonth ? "outside" : "", key === selectedDay ? "selected" : "", key === today ? "today" : ""].filter(Boolean).join(" ")} type="button" key={key} onClick={() => setSelectedDay(key)}>
                  <span className="calendar-day-number">{date.getDate()}</span>
                  <span className="calendar-day-appointments">
                    {appointments.slice(0, 3).map((appointment) => <span className={`calendar-appointment-pill ${appointment.status}`} key={appointment.id}>{new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(appointment.starts_at))} {customersById.get(appointment.customer_id)?.display_name || appointment.title}</span>)}
                    {appointments.length > 3 ? <small>+{appointments.length - 3} more</small> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-day-panel" aria-labelledby="selected-day-title">
          <div className="account-sidebar-heading"><div><p className="eyebrow">Selected day</p><h2 id="selected-day-title">{longDate(selectedDay)}</h2></div><button className="icon-button" type="button" aria-label="Add appointment on selected day" disabled={!activeCustomers.length} onClick={() => { setEditingAppointment(null); setAppointmentFormOpen(true); }}><Plus /></button></div>
          {selectedAppointments.length ? (
            <div className="calendar-agenda-list">
              {selectedAppointments.map((appointment) => {
                const customer = customersById.get(appointment.customer_id);
                return (
                  <article className={`calendar-agenda-card ${appointment.status}`} key={appointment.id}>
                    <div className="calendar-agenda-heading"><div><span>{appointmentTime(appointment)}</span><h3>{appointment.title}</h3></div><span className="account-activity-status">{appointment.status}</span></div>
                    <p><UsersThree /> {customer?.display_name || "Customer"}</p>
                    {appointment.location ? <p><MapPin /> {appointment.location}</p> : null}
                    {appointment.notes ? <p><NotePencil /> {appointment.notes}</p> : null}
                    <div className="calendar-agenda-actions">
                      <button className="account-link-button" type="button" disabled={busy} onClick={() => { setEditingAppointment(appointment); setAppointmentFormOpen(true); }}>Edit</button>
                      {appointment.status === "scheduled" ? <><button className="account-link-button" type="button" disabled={busy} onClick={() => setAppointmentStatus(appointment, "completed")}><CheckCircle /> Complete</button><button className="account-link-button danger-link" type="button" disabled={busy} onClick={() => setAppointmentStatus(appointment, "cancelled")}><XCircle /> Cancel</button></> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="account-empty-list"><Clock weight="duotone" /><div><h3>No appointments</h3><p>This day is open.</p></div></div>
          )}
        </aside>
      </div>

      <section className="calendar-customer-directory" aria-labelledby="customer-directory-title">
        <div className="account-section-heading"><div><p className="eyebrow">Private directory</p><h2 id="customer-directory-title">Customers</h2></div><span>{activeCustomers.length} active</span></div>
        {activeCustomers.length ? (
          <div className="calendar-customer-list">
            {activeCustomers.map((customer) => (
              <article className="calendar-customer-card" key={customer.id}>
                <div className="account-small-avatar" aria-hidden="true"><UsersThree weight="duotone" /></div>
                <div><h3>{customer.display_name}</h3><p>{customer.phone || customer.email || "Contact details not added"}</p>{customer.address ? <small>{customer.address}</small> : null}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-empty-list"><CalendarBlank weight="duotone" /><div><h3>Add your first customer</h3><p>Their details stay private and can be used when scheduling appointments.</p></div><button className="button primary compact-button" type="button" onClick={() => setCustomerFormOpen(true)}>Add customer</button></div>
        )}
      </section>
    </div>
  );
}
