"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight, GraduationCap, Package, PencilSimple, Plus, Question, Wrench, X } from "@phosphor-icons/react";
import { AccountSignIn } from "@/components/AccountSignIn";
import { RequestBuilder } from "@/components/RequestBuilder";
import {
  createEmptyRequestDraft,
  getRequestCategory,
  isStructuredRequest,
  requestDatabasePayload,
  requestDisplayStatus,
  requestDraftFromRecord,
  requestNextStep,
  requestTimingLabel,
  type RequestDraft,
  type StructuredRequestRecord,
} from "@/lib/requestSystem";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";

type PostType = "service" | "goods" | "event" | "mentoring" | "request";
type OwnerState = "active" | "paused" | "closed" | "removed";
type AccountPost = Omit<StructuredRequestRecord, "post_type"> & { post_type: PostType; contact: string | null; website_url: string | null };
type PostsData = { person: { id: string; display_name: string; town: string | null; state: string | null }; posts: AccountPost[] };
type ViewState = { status: "loading" | "config" | "signed-out" } | { status: "error"; message: string } | { status: "ready"; data: PostsData };

const postTypes = [
  { value: "service", label: "Services", Icon: Wrench },
  { value: "goods", label: "Goods", Icon: Package },
  { value: "event", label: "Events", Icon: CalendarBlank },
  { value: "mentoring", label: "Mentoring", Icon: GraduationCap },
  { value: "request", label: "Requests", Icon: Question },
] as const;
const postTypeLabels: Record<PostType, string> = { service: "Service", goods: "Goods", event: "Event", mentoring: "Mentoring", request: "Request" };
const postTypeIcons = { service: Wrench, goods: Package, event: CalendarBlank, mentoring: GraduationCap, request: Question } as const;

function isDesignPreview() {
  return process.env.NODE_ENV === "development" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
}

function designPreviewState() {
  return typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("previewState") || "";
}

function emptyRequestFields(): Pick<AccountPost,
  "request_schema_version" | "request_broad_type" | "request_category_id" | "request_subcategory_id" | "request_answers" |
  "service_intent" | "timing_preference" | "requested_date" | "requested_date_end" | "time_windows" | "cadence_frequency" |
  "cadence_days" | "cadence_time_windows" | "desired_start_period" | "schedule_flexibility" | "generated_summary" | "request_status" | "workflow_status"
> {
  return {
    request_schema_version: null, request_broad_type: null, request_category_id: null, request_subcategory_id: null, request_answers: {},
    service_intent: null, timing_preference: null, requested_date: null, requested_date_end: null, time_windows: [], cadence_frequency: null,
    cadence_days: [], cadence_time_windows: [], desired_start_period: null, schedule_flexibility: null, generated_summary: null,
    request_status: null, workflow_status: null,
  };
}

function previewData(): PostsData {
  const draft: RequestDraft = {
    ...createEmptyRequestDraft({ broadType: "home_help", categoryId: "cleaning", city: "Peotone", state: "IL" }),
    answers: { cleaningType: "regular", cleaningScope: "selected_areas", areas: ["kitchen", "main_living_area", "bathrooms"], bathrooms: 2, bedrooms: 0, cleaningTasks: ["floors", "kitchen", "bathrooms"], suppliesAvailable: "yes", petsInHome: "yes" },
    serviceIntent: "ongoing", cadenceFrequency: "every_other_week", cadenceDays: ["tuesday"], cadenceTimeWindows: ["morning"],
    desiredStartPeriod: "within_two_weeks", scheduleFlexibility: "somewhat_flexible",
  };
  const structured = requestDatabasePayload(draft);
  const base = { contact: null, website_url: null, admin_notes: null, created_at: "2026-08-22T12:00:00Z", updated_at: "2026-08-22T12:00:00Z" };
  return {
    person: { id: "preview-garrett", display_name: "Garrett", town: "Peotone", state: "IL" },
    posts: [
      { ...base, id: "request-structured", post_type: "request", owner_state: "active", status: "pending", ...structured },
      { ...base, ...emptyRequestFields(), id: "post-1", post_type: "service", owner_state: "active", title: "Furniture assembly and small repairs", category: "Handyman help", city: "Peotone", state: "IL", description: "Assembly, mounting, and practical fixes around the house.", status: "approved", created_at: "2026-08-04T12:00:00Z", updated_at: "2026-08-13T12:00:00Z" },
      { ...base, ...emptyRequestFields(), id: "post-2", post_type: "goods", owner_state: "active", title: "Local honey", category: "Honey and pantry", city: "Peotone", state: "IL", description: "Small-batch local honey with porch pickup available.", status: "pending", created_at: "2026-08-10T12:00:00Z", updated_at: "2026-08-14T12:00:00Z" },
      { ...base, ...emptyRequestFields(), id: "post-3", post_type: "event", owner_state: "active", title: "Peotone Plant Swap", category: "Community gathering", city: "Peotone", state: "IL", description: "Bring extra plants, seeds, tomatoes, and herbs to share.", status: "approved", created_at: "2026-08-02T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" },
      { ...base, ...emptyRequestFields(), id: "post-4", post_type: "mentoring", owner_state: "paused", title: "Practical AI help", category: "Technology", city: "Peotone", state: "IL", description: "One-on-one help using AI tools for everyday work and learning.", status: "approved", created_at: "2026-07-28T12:00:00Z", updated_at: "2026-08-09T12:00:00Z" },
      { ...base, ...emptyRequestFields(), id: "post-5", post_type: "request", owner_state: "closed", title: "Help assembling shelves", category: "Furniture assembly", city: "Peotone", state: "IL", description: "Looking for help assembling two shelving units.", status: "approved", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-11T12:00:00Z" },
    ],
  };
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function postStatus(post: AccountPost) {
  if (post.post_type === "request") {
    const label = requestDisplayStatus(post as StructuredRequestRecord);
    const tone = label === "Needs changes" ? "changes" : label === "In review" || label === "Reviewed" ? "review" : label === "Closed" || label === "Cancelled" ? "closed" : "published";
    return { label, tone };
  }
  if (post.owner_state === "paused") return { label: "Paused", tone: "paused" };
  if (post.owner_state === "closed") return { label: "Closed", tone: "closed" };
  if (post.owner_state === "removed") return { label: "Removed", tone: "removed" };
  if (post.status === "approved") return { label: "Published", tone: "published" };
  if (post.status === "rejected") return { label: "Needs changes", tone: "changes" };
  return { label: "In review", tone: "review" };
}

export function AccountPostsManager({ openNewRequest = false, initialCategory = "", initialRequestId = "" }: { openNewRequest?: boolean; initialCategory?: string; initialRequestId?: string }) {
  const [view, setView] = useState<ViewState>(() => isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" });
  const [postFilter, setPostFilter] = useState<"all" | PostType>(openNewRequest || initialRequestId ? "request" : "all");
  const [postEditor, setPostEditor] = useState<"new" | string | null>(openNewRequest ? "new" : initialRequestId || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadPosts = useCallback(async () => {
    if (isDesignPreview()) {
      const state = designPreviewState();
      if (state === "loading") { setView({ status: "loading" }); return; }
      if (state === "error") { setView({ status: "error", message: "Your posts could not be opened." }); return; }
      const data = previewData();
      setView({ status: "ready", data: state === "empty" ? { ...data, posts: [] } : data });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) { setView({ status: "config" }); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setView({ status: "signed-out" }); return; }
    const response = await fetch("/api/account", { headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) { setView(response.status === 401 ? { status: "signed-out" } : { status: "error", message: payload.error || "Your posts could not be opened." }); return; }
    setView({ status: "ready", data: { person: payload.person, posts: payload.posts || [] } });
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadPosts(), 0); return () => window.clearTimeout(timer); }, [loadPosts]);

  async function accountPost(body: Record<string, unknown>) {
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getSession()) || { data: { session: null } };
    if (!data.session) throw new Error("Sign in to continue.");
    const response = await fetch("/api/account", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
    return payload;
  }

  async function saveStructuredRequest(draft: RequestDraft) {
    if (view.status !== "ready") return;
    const editingId = postEditor && postEditor !== "new" ? postEditor : null;
    setBusy(true); setMessage("");
    try {
      if (isDesignPreview()) {
        const now = new Date().toISOString();
        const fields = requestDatabasePayload(draft);
        setView((current) => current.status !== "ready" ? current : { status: "ready", data: { ...current.data, posts: editingId
          ? current.data.posts.map((post) => post.id === editingId ? { ...post, ...fields, owner_state: "active", status: "pending", admin_notes: null, updated_at: now } : post)
          : [{ ...emptyRequestFields(), ...fields, id: `preview-${window.crypto.randomUUID()}`, post_type: "request", owner_state: "active", contact: null, website_url: null, status: "pending", admin_notes: null, created_at: now, updated_at: now }, ...current.data.posts] } });
      } else {
        await accountPost({ action: editingId ? "update-request" : "create-request", requestId: editingId, request: draft });
        await loadPosts();
      }
      setMessage(editingId ? "Your request was updated and returned to review." : "Your request was saved and sent for review.");
      setPostEditor(null);
      if (!editingId && !isDesignPreview()) window.location.assign("/account#my-requests");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your request could not be saved."); }
    finally { setBusy(false); }
  }

  async function saveLegacyPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.status !== "ready" || !postEditor || postEditor === "new") return;
    const values = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      if (isDesignPreview()) {
        const now = new Date().toISOString();
        setView((current) => current.status !== "ready" ? current : { status: "ready", data: { ...current.data, posts: current.data.posts.map((post) => post.id === postEditor ? { ...post, title: String(values.get("title") || ""), category: String(values.get("category") || "") || null, description: String(values.get("description") || ""), city: String(values.get("city") || "") || null, state: String(values.get("state") || "") || null, contact: String(values.get("contact") || "") || null, website_url: String(values.get("websiteUrl") || "") || null, owner_state: "active", status: "pending", admin_notes: null, updated_at: now } : post) } });
      } else {
        await accountPost({ action: "update-post", postId: postEditor, title: values.get("title"), category: values.get("category"), description: values.get("description"), city: values.get("city"), state: values.get("state"), contact: values.get("contact"), websiteUrl: values.get("websiteUrl") });
        await loadPosts();
      }
      setMessage("Your post was updated and returned to review."); setPostEditor(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your post could not be saved."); }
    finally { setBusy(false); }
  }

  async function setPostState(postId: string, ownerState: OwnerState) {
    setBusy(true); setMessage("");
    try {
      if (isDesignPreview()) setView((current) => current.status !== "ready" ? current : { status: "ready", data: { ...current.data, posts: current.data.posts.map((post) => post.id === postId ? { ...post, owner_state: ownerState, updated_at: new Date().toISOString() } : post) } });
      else { await accountPost({ action: "set-post-state", postId, ownerState }); await loadPosts(); }
      setMessage(ownerState === "active" ? "Your post is active again." : `Your post is now ${ownerState}.`); setPostEditor(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "This post could not be updated."); }
    finally { setBusy(false); }
  }

  const data = view.status === "ready" ? view.data : null;
  const editingPost = data && postEditor && postEditor !== "new" ? data.posts.find((post) => post.id === postEditor) || null : null;
  const structuredDraft = editingPost?.post_type === "request" ? requestDraftFromRecord(editingPost as StructuredRequestRecord) : null;
  const newDraft = createEmptyRequestDraft({ broadType: initialCategory, categoryId: initialCategory, city: data?.person.town, state: data?.person.state });
  const filteredPosts = useMemo(() => !data ? [] : postFilter === "all" ? data.posts : data.posts.filter((post) => post.post_type === postFilter), [data, postFilter]);

  if (view.status === "loading") return <section className="account-loading" aria-live="polite">Opening your posts…</section>;
  if (view.status === "config") return <section className="notice bad"><h2>Account access is not configured</h2><p>Add the Supabase browser settings for this environment.</p></section>;
  if (view.status === "signed-out") return <AccountSignIn title="Sign in to manage your posts" returnTo="/account/posts" />;
  if (view.status === "error") return <section className="notice bad">{view.message}</section>;
  if (!data) return null;

  const previewQuery = isDesignPreview() ? "?preview=1" : "";
  const publishedCount = data.posts.filter((post) => post.owner_state === "active" && post.status === "approved").length;
  const reviewCount = data.posts.filter((post) => post.owner_state === "active" && (post.status === "pending" || post.status === "reviewed")).length;
  const inactiveCount = data.posts.filter((post) => post.owner_state !== "active").length;

  return (
    <div className="account-posts-manager">
      <section className="account-posts-page-header">
        <Link className="account-back-link" href={`/account${previewQuery}`}><CaretLeft /> Back to account</Link>
        <div><p className="eyebrow">Your community activity</p><h1>Requests and posts</h1><p>Create requests for what you need, and manage anything you shared earlier through Localized.life.</p></div>
        <button className="button primary" type="button" onClick={() => { setPostFilter("request"); setPostEditor("new"); }}><Plus weight="bold" /> New request</button>
      </section>
      {message ? <p className="notice good account-posts-message" aria-live="polite">{message}</p> : null}
      <section className="account-posts-summary" aria-label="Post summary"><div><strong>{data.posts.length}</strong><span>All posts</span></div><div><strong>{publishedCount}</strong><span>Published</span></div><div><strong>{reviewCount}</strong><span>In review</span></div><div><strong>{inactiveCount}</strong><span>Paused or closed</span></div></section>

      {postEditor ? (
        <section className="account-post-editor account-posts-page-editor" aria-labelledby="account-post-editor-title">
          <div className="account-inline-heading"><div><p className="eyebrow">{editingPost ? `Manage ${postTypeLabels[editingPost.post_type]}` : "Create a request"}</p><h2 id="account-post-editor-title">{editingPost ? editingPost.title : "What are you looking for?"}</h2></div><button className="icon-button" type="button" aria-label="Close post editor" onClick={() => setPostEditor(null)}><X /></button></div>
          {postEditor === "new" || structuredDraft ? (
            <>
              {editingPost && structuredDraft ? (
                <div className="request-management-summary" aria-label="Request management status">
                  <div><small>Current status</small><strong>{requestDisplayStatus(editingPost as StructuredRequestRecord)}</strong></div>
                  <div><small>Next step</small><strong>{requestNextStep(editingPost as StructuredRequestRecord)}</strong></div>
                  <div className="request-management-actions">
                    {editingPost.owner_state === "active" ? <><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "paused")}>Pause request</button><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "closed")}>Mark closed</button></> : <button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "active")}>Make active</button>}
                    {editingPost.owner_state !== "removed" ? <button className="button compact-button danger-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "removed")}>Remove request</button> : null}
                  </div>
                  {editingPost.status === "rejected" && editingPost.admin_notes ? <p className="notice bad">Review note: {editingPost.admin_notes}</p> : null}
                </div>
              ) : null}
              <RequestBuilder key={editingPost?.id || "new-request"} initialDraft={structuredDraft || newDraft} initialStep={structuredDraft ? 3 : 0} busy={busy} submitLabel={editingPost ? "Save changes" : undefined} onCancel={() => setPostEditor(null)} onSubmit={saveStructuredRequest} />
            </>
          ) : editingPost ? (
            <form className="form account-owned-post-form" onSubmit={saveLegacyPost}>
              {editingPost.post_type === "request" ? <p className="notice">This earlier request uses the original format. Its history is preserved, and you can continue editing its existing fields.</p> : null}
              <label>Title<input name="title" required defaultValue={editingPost.title} /></label>
              <div className="grid two"><label>Category<input name="category" defaultValue={editingPost.category || ""} /></label><label>Public link<input name="websiteUrl" type="url" defaultValue={editingPost.website_url || ""} placeholder="https://..." /></label></div>
              <label>Description<textarea name="description" rows={5} required defaultValue={editingPost.description} /></label>
              <div className="grid two"><label>Town<input name="city" defaultValue={editingPost.city || data.person.town || ""} /></label><label>State<input name="state" maxLength={2} defaultValue={editingPost.state || data.person.state || "IL"} /></label></div>
              <label>Public contact or next step<input name="contact" defaultValue={editingPost.contact || ""} /></label>
              <div className="account-post-editor-actions"><button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>{editingPost.owner_state === "active" ? <><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "paused")}>Pause post</button><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "closed")}>Mark closed</button></> : <button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "active")}>Make active</button>}{editingPost.owner_state !== "removed" ? <button className="button compact-button danger-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "removed")}>Remove post</button> : null}</div>
              {editingPost.status === "rejected" && editingPost.admin_notes ? <p className="notice bad">Review note: {editingPost.admin_notes}</p> : null}
            </form>
          ) : <p className="notice bad">That post is not available in your account.</p>}
        </section>
      ) : null}

      <section className="account-post-library account-posts-page-library" aria-labelledby="account-post-library-title">
        <div className="account-post-library-heading"><div><h2 id="account-post-library-title">Request and post history</h2><p>Earlier posts remain here so you do not lose their history. New entries are created as requests.</p></div><span>{filteredPosts.length} shown</span></div>
        <div className="account-post-filters" role="group" aria-label="Filter your posts"><button className={postFilter === "all" ? "active" : ""} type="button" onClick={() => setPostFilter("all")}>All</button>{postTypes.map(({ value, label }) => <button className={postFilter === value ? "active" : ""} type="button" key={value} onClick={() => setPostFilter(value)}>{label}</button>)}</div>
        {filteredPosts.length ? <div className="account-owned-post-list">{filteredPosts.map((post) => {
          const Icon = postTypeIcons[post.post_type];
          const state = postStatus(post);
          const structured = post.post_type === "request" && isStructuredRequest(post as StructuredRequestRecord);
          const requestDraft = structured ? requestDraftFromRecord(post as StructuredRequestRecord) : null;
          const category = structured ? getRequestCategory(post.request_category_id) : null;
          return <article className="account-owned-post-row" key={post.id}><div className={`account-owned-post-icon account-owned-post-icon-${post.post_type}`} aria-hidden="true"><Icon weight="duotone" /></div><div className="account-owned-post-copy"><div><span>{postTypeLabels[post.post_type]}{category ? ` · ${category.label}` : ""}</span><small>Updated {shortDate(post.updated_at)}</small></div><h3>{post.title}</h3><p>{post.generated_summary || post.description}</p>{requestDraft ? <small>{requestDraft.serviceIntent === "ongoing" ? "Ongoing help" : "One-time help"} · {requestTimingLabel(requestDraft)}</small> : null}</div><span className={`account-owned-post-status account-owned-post-status-${state.tone}`}>{state.label}</span><button className="account-manage-post-button" type="button" onClick={() => setPostEditor(post.id)}>Manage<CaretRight /></button></article>;
        })}</div> : <div className="account-empty-list"><PencilSimple weight="duotone" /><div><h3>No {postFilter === "all" ? "entries" : postTypeLabels[postFilter].toLowerCase()} yet</h3><p>Create a request when you are looking for something from your community.</p></div></div>}
      </section>
    </div>
  );
}
