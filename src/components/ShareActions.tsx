"use client";

type ShareActionsProps = {
  listingUrl: string;
  postText: string;
  title: string;
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ShareActions({ listingUrl, postText, title }: ShareActionsProps) {
  async function nativeShare() {
    if (!navigator.share) {
      await copyText(postText);
      return;
    }

    await navigator.share({
      title,
      text: postText,
      url: listingUrl,
    });
  }

  return (
    <section className="share-tools panel stack">
      <div>
        <p className="eyebrow">Share tools</p>
        <h2>Send people to this listing</h2>
        <p className="muted">
          Use the public listing link anywhere. The post text is written for Facebook, Nextdoor, Craigslist, groups, or
          a text message.
        </p>
      </div>

      <div className="share-link-card">
        <div>
          <strong>Public listing link</strong>
          <p>{listingUrl}</p>
        </div>
        <button className="button" type="button" onClick={() => copyText(listingUrl)}>
          Copy link
        </button>
      </div>

      <div className="share-action-grid">
        <button className="button primary" type="button" onClick={nativeShare}>
          Share from device
        </button>
        <button className="button" type="button" onClick={() => copyText(postText)}>
          Copy post text
        </button>
      </div>

      <label className="share-post-field">
        Post text
        <textarea readOnly rows={13} value={postText} />
      </label>
    </section>
  );
}
