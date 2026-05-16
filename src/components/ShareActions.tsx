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
    <div className="stack">
      <h2>Share tools</h2>
      <div className="toolbar">
        <button className="button primary" type="button" onClick={nativeShare}>
          Share
        </button>
        <button className="button" type="button" onClick={() => copyText(listingUrl)}>
          Copy listing link
        </button>
      </div>

      <label>
        Post text
        <textarea readOnly rows={7} value={postText} />
      </label>
      <button className="button" type="button" onClick={() => copyText(postText)}>
        Copy post text
      </button>
    </div>
  );
}
