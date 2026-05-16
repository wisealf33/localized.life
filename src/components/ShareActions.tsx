"use client";

type ShareActionsProps = {
  listingUrl: string;
  postText: string;
  outreachText: string;
  groupCommentText: string;
  title: string;
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ShareActions({ listingUrl, postText, outreachText, groupCommentText, title }: ShareActionsProps) {
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

      <label>
        Organizer outreach
        <textarea readOnly rows={8} value={outreachText} />
      </label>
      <button className="button" type="button" onClick={() => copyText(outreachText)}>
        Copy outreach message
      </button>

      <label>
        Group comment
        <textarea readOnly rows={5} value={groupCommentText} />
      </label>
      <button className="button" type="button" onClick={() => copyText(groupCommentText)}>
        Copy group comment
      </button>
    </div>
  );
}
