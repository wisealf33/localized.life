"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  GraduationCap,
  Package,
  PencilSimple,
  Plus,
  Question,
  Wrench,
  X,
} from "@phosphor-icons/react";
import { AccountSignIn } from "@/components/AccountSignIn";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";

type PostType = "service" | "goods" | "event" | "mentoring" | "request";
type OwnerState = "active" | "paused" | "closed" | "removed";

type AccountPost = {
  id: string;
  post_type: PostType;
  owner_state: OwnerState;
  title: string;
  category: string | null;
  contact: string | null;
  city: string | null;
  state: string | null;
  website_url: string | null;
  description: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type PostsData = {
  person: { id: string; display_name: string; town: string | null; state: string | null };
  posts: AccountPost[];
};

type ViewState =
  | { status: "loading" | "config" | "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PostsData };

const postTypes = [
  { value: "service", label: "Services", singular: "Service", Icon: Wrench },
  { value: "goods", label: "Goods", singular: "Goods", Icon: Package },
  { value: "event", label: "Events", singular: "Event", Icon: CalendarBlank },
  { value: "mentoring", label: "Mentoring", singular: "Mentoring", Icon: GraduationCap },
  { value: "request", label: "Requests", singular: "Request", Icon: Question },
] as const;

const postTypeLabels: Record<PostType, string> = {
  service: "Service",
  goods: "Goods",
  event: "Event",
  mentoring: "Mentoring",
  request: "Request",
};

const postTypeIcons = {
  service: Wrench,
  goods: Package,
  event: CalendarBlank,
  mentoring: GraduationCap,
  request: Question,
} as const;

function isDesignPreview() {
  return process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1";
}

function previewData(): PostsData {
  return {
    person: { id: "preview-garrett", display_name: "Garrett", town: "Peotone", state: "IL" },
    posts: [
      { id: "post-1", post_type: "service", owner_state: "active", title: "Furniture assembly and small repairs", category: "Handyman help", contact: "Message through Localized.life", city: "Peotone", state: "IL", website_url: null, description: "Assembly, mounting, and practical fixes around the house.", status: "approved", admin_notes: null, created_at: "2026-08-04T12:00:00Z", updated_at: "2026-08-13T12:00:00Z" },
      { id: "post-2", post_type: "goods", owner_state: "active", title: "Local honey", category: "Honey and pantry", contact: "Pickup by arrangement", city: "Peotone", state: "IL", website_url: null, description: "Small-batch local honey with porch pickup available.", status: "pending", admin_notes: null, created_at: "2026-08-10T12:00:00Z", updated_at: "2026-08-14T12:00:00Z" },
      { id: "post-3", post_type: "event", owner_state: "active", title: "Peotone Plant Swap", category: "Community gathering", contact: null, city: "Peotone", state: "IL", website_url: null, description: "Bring extra plants, seeds, tomatoes, and herbs to share.", status: "approved", admin_notes: null, created_at: "2026-08-02T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" },
      { id: "post-4", post_type: "mentoring", owner_state: "paused", title: "Practical AI help", category: "Technology", contact: null, city: "Peotone", state: "IL", website_url: null, description: "One-on-one help using AI tools for everyday work and learning.", status: "approved", admin_notes: null, created_at: "2026-07-28T12:00:00Z", updated_at: "2026-08-09T12:00:00Z" },
      { id: "post-5", post_type: "request", owner_state: "closed", title: "Help assembling shelves", category: "Furniture assembly", contact: null, city: "Peotone", state: "IL", website_url: null, description: "Looking for help assembling two shelving units.", status: "approved", admin_notes: null, created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-11T12:00:00Z" },
    ],
  };
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function postStatus(post: AccountPost) {
  if (post.owner_state === "paused") return { label: "Paused", tone: "paused" };
  if (post.owner_state === "closed") return { label: "Closed", tone: "closed" };
  if (post.owner_state === "removed") return { label: "Removed", tone: "removed" };
  if (post.status === "approved") return { label: "Published", tone: "published" };
  if (post.status === "rejected") return { label: "Needs changes", tone: "changes" };
  return { label: "In review", tone: "review" };
}

export function AccountPostsManager({ initialPostType }: { initialPostType?: PostType }) {
  const [view, setView] = useState<ViewState>(() => isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" });
  const [postFilter, setPostFilter] = useState<"all" | PostType>(initialPostType || "all");
  const [newPostType, setNewPostType] = useState<PostType>(initialPostType || "service");
  const [postEditor, setPostEditor] = useState<"new" | string | null>(initialPostType ? "new" : null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadPosts = useCallback(async () => {
    if (isDesignPreview()) {
      setView({ status: "ready", data: previewData() });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setView({ status: "config" });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setView({ status: "signed-out" });
      return;
    }
    const response = await fetch("/api/account", {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      setView(response.status === 401 ? { status: "signed-out" } : { status: "error", message: payload.error || "Your posts could not be opened." });
      return;
    }
    setView({ status: "ready", data: { person: payload.person, posts: payload.posts || [] } });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPosts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  async function accountPost(body: Record<string, unknown>) {
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getSession()) || { data: { session: null } };
    if (!data.session) throw new Error("Sign in to continue.");
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.status !== "ready") return;
    const values = new FormData(event.currentTarget);
    const editingId = postEditor && postEditor !== "new" ? postEditor : null;
    const selectedPostType = String(values.get("postType") || newPostType) as PostType;
    const payload = {
      action: editingId ? "update-post" : "create-post",
      postId: editingId,
      postType: selectedPostType,
      title: values.get("title"),
      category: values.get("category"),
      description: values.get("description"),
      city: values.get("city"),
      state: values.get("state"),
      contact: values.get("contact"),
      websiteUrl: values.get("websiteUrl"),
    };

    setBusy(true);
    setMessage("");
    try {
      if (isDesignPreview()) {
        const now = new Date().toISOString();
        setView((current) => {
          if (current.status !== "ready") return current;
          const existing = editingId ? current.data.posts.find((post) => post.id === editingId) : null;
          const nextPost: AccountPost = {
            id: editingId || `preview-${window.crypto.randomUUID()}`,
            post_type: selectedPostType,
            owner_state: "active",
            title: String(values.get("title") || ""),
            category: String(values.get("category") || "") || null,
            description: String(values.get("description") || ""),
            city: String(values.get("city") || "") || null,
            state: String(values.get("state") || "") || null,
            contact: String(values.get("contact") || "") || null,
            website_url: String(values.get("websiteUrl") || "") || null,
            status: "pending",
            admin_notes: null,
            created_at: existing?.created_at || now,
            updated_at: now,
          };
          return {
            status: "ready",
            data: {
              ...current.data,
              posts: editingId
                ? current.data.posts.map((post) => post.id === editingId ? nextPost : post)
                : [nextPost, ...current.data.posts],
            },
          };
        });
      } else {
        await accountPost(payload);
        await loadPosts();
      }
      setMessage(editingId ? "Your post was updated and returned to review." : "Your post was saved and sent for review.");
      setPostEditor(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your post could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setPostState(postId: string, ownerState: OwnerState) {
    setBusy(true);
    setMessage("");
    try {
      if (isDesignPreview()) {
        setView((current) => current.status === "ready"
          ? {
              status: "ready",
              data: {
                ...current.data,
                posts: current.data.posts.map((post) => post.id === postId
                  ? { ...post, owner_state: ownerState, updated_at: new Date().toISOString() }
                  : post),
              },
            }
          : current);
      } else {
        await accountPost({ action: "set-post-state", postId, ownerState });
        await loadPosts();
      }
      setMessage(ownerState === "active" ? "Your post is active again." : `Your post is now ${ownerState}.`);
      setPostEditor(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This post could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const data = view.status === "ready" ? view.data : null;
  const editingPost = data && postEditor && postEditor !== "new"
    ? data.posts.find((post) => post.id === postEditor) || null
    : null;
  const editorPostType = editingPost?.post_type || newPostType;
  const editorDefinition = postTypes.find((type) => type.value === editorPostType) || postTypes[0];
  const filteredPosts = useMemo(() => !data
    ? []
    : postFilter === "all"
      ? data.posts
      : data.posts.filter((post) => post.post_type === postFilter), [data, postFilter]);

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
        <div>
          <p className="eyebrow">Your publishing</p>
          <h1>My posts</h1>
          <p>Review, update, pause, close, or restore anything you have shared through Localized.life.</p>
        </div>
        <button className="button primary" type="button" onClick={() => setPostEditor("new")}><Plus weight="bold" /> New post</button>
      </section>

      {message ? <p className="notice good account-posts-message" aria-live="polite">{message}</p> : null}

      <section className="account-posts-summary" aria-label="Post summary">
        <div><strong>{data.posts.length}</strong><span>All posts</span></div>
        <div><strong>{publishedCount}</strong><span>Published</span></div>
        <div><strong>{reviewCount}</strong><span>In review</span></div>
        <div><strong>{inactiveCount}</strong><span>Paused or closed</span></div>
      </section>

      {postEditor ? (
        <section className="account-post-editor account-posts-page-editor" aria-labelledby="account-post-editor-title">
          <div className="account-inline-heading">
            <div><p className="eyebrow">{editingPost ? `Manage ${postTypeLabels[editingPost.post_type]}` : "Create a post"}</p><h2 id="account-post-editor-title">{editingPost ? editingPost.title : "What do you want to share?"}</h2></div>
            <button className="icon-button" type="button" aria-label="Close post editor" onClick={() => setPostEditor(null)}><X /></button>
          </div>
          <form className="form account-owned-post-form" key={editingPost?.id || `new-${editorPostType}`} onSubmit={savePost}>
            {!editingPost ? (
              <fieldset className="account-new-post-types">
                <legend>Post type</legend>
                {postTypes.map(({ value, singular, Icon }) => <button className={newPostType === value ? "active" : ""} type="button" key={value} onClick={() => { setNewPostType(value); setPostFilter(value); }}><Icon weight="duotone" />{singular}</button>)}
              </fieldset>
            ) : null}
            <input type="hidden" name="postType" value={editorPostType} />
            <label>Title<input name="title" required defaultValue={editingPost?.title || ""} placeholder={`Title for your ${editorDefinition.singular.toLowerCase()}`} /></label>
            <div className="grid two"><label>Category<input name="category" defaultValue={editingPost?.category || ""} placeholder="How should people find this?" /></label><label>Public link<input name="websiteUrl" type="url" defaultValue={editingPost?.website_url || ""} placeholder="https://..." /></label></div>
            <label>Description<textarea name="description" rows={5} required defaultValue={editingPost?.description || ""} placeholder="Share the useful details people need to understand this post." /></label>
            <div className="grid two"><label>Town<input name="city" defaultValue={editingPost?.city || data.person.town || ""} /></label><label>State<input name="state" maxLength={2} defaultValue={editingPost?.state || data.person.state || "IL"} /></label></div>
            <label>Public contact or next step<input name="contact" defaultValue={editingPost?.contact || ""} placeholder="How should someone respond?" /></label>
            <div className="account-post-editor-actions">
              <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : editingPost ? "Save changes" : "Submit for review"}</button>
              {editingPost?.owner_state === "active" ? <><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "paused")}>Pause post</button><button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "closed")}>Mark closed</button></> : editingPost ? <button className="button compact-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "active")}>Make active</button> : null}
              {editingPost && editingPost.owner_state !== "removed" ? <button className="button compact-button danger-button" type="button" disabled={busy} onClick={() => setPostState(editingPost.id, "removed")}>Remove post</button> : null}
            </div>
            {editingPost?.status === "rejected" && editingPost.admin_notes ? <p className="notice bad">Review note: {editingPost.admin_notes}</p> : null}
          </form>
        </section>
      ) : null}

      <section className="account-post-library account-posts-page-library" aria-labelledby="account-post-library-title">
        <div className="account-post-library-heading"><div><h2 id="account-post-library-title">Post history</h2><p>Closed and removed posts remain here so you do not lose the record.</p></div><span>{filteredPosts.length} shown</span></div>
        <div className="account-post-filters" role="group" aria-label="Filter your posts"><button className={postFilter === "all" ? "active" : ""} type="button" onClick={() => setPostFilter("all")}>All</button>{postTypes.map(({ value, label }) => <button className={postFilter === value ? "active" : ""} type="button" key={value} onClick={() => setPostFilter(value)}>{label}</button>)}</div>
        {filteredPosts.length ? <div className="account-owned-post-list">{filteredPosts.map((post) => { const Icon = postTypeIcons[post.post_type]; const status = postStatus(post); return <article className="account-owned-post-row" key={post.id}><div className={`account-owned-post-icon account-owned-post-icon-${post.post_type}`} aria-hidden="true"><Icon weight="duotone" /></div><div className="account-owned-post-copy"><div><span>{postTypeLabels[post.post_type]}</span><small>Updated {shortDate(post.updated_at)}</small></div><h3>{post.title}</h3><p>{post.description}</p></div><span className={`account-owned-post-status account-owned-post-status-${status.tone}`}>{status.label}</span><button className="account-manage-post-button" type="button" onClick={() => setPostEditor(post.id)}>Manage<CaretRight /></button></article>; })}</div> : <div className="account-empty-list"><PencilSimple weight="duotone" /><div><h3>No {postFilter === "all" ? "posts" : postTypeLabels[postFilter].toLowerCase()} yet</h3><p>Create one when you have something useful to share.</p></div></div>}
      </section>
    </div>
  );
}
