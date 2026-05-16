import { Resend } from "resend";
import { publicClaimMessageForSale, saleUrl } from "./format";
import { facebookDestinationInstruction, regionDestinationForSale } from "./regions";

type ClaimInstructionsEmail = {
  claimantEmail: string;
  claimantName: string;
  listingTitle: string;
  slug: string;
  city: string;
  state: string;
  sourceUrl: string | null;
};

type ClaimApprovedEmail = {
  claimantEmail: string;
  claimantName: string;
  listingTitle: string;
  slug: string;
  city: string;
  state: string;
  manageToken: string;
};

function emailClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SALETRAIL_EMAIL_FROM;
  if (!apiKey || !from) return null;

  return {
    from,
    resend: new Resend(apiKey),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function manageUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/saletrail/manage/${token}`;
}

export async function sendClaimInstructionsEmail({
  claimantEmail,
  claimantName,
  listingTitle,
  slug,
  city,
  state,
  sourceUrl,
}: ClaimInstructionsEmail) {
  const client = emailClient();
  if (!client) return { sent: false, reason: "Email is not configured." };

  const message = publicClaimMessageForSale({ slug, city, state });
  const facebookDestination = regionDestinationForSale({ city, state });
  const groupUrl = facebookDestination.url;
  const safeName = escapeHtml(claimantName);
  const safeTitle = escapeHtml(listingTitle);
  const safeMessage = escapeHtml(message);
  const safeDestinationName = escapeHtml(facebookDestination.name);
  const safeDestinationInstruction = escapeHtml(facebookDestinationInstruction({ city, state }));
  const html = `
    <div style="font-family: Arial, sans-serif; color: #20201d; line-height: 1.5;">
      <h1 style="font-size: 24px;">Finish your SaleTrail claim</h1>
      <p>Hi ${safeName},</p>
      <p>Your claim request for <strong>${safeTitle}</strong> is in the admin review queue.</p>
      <p>To finish the claim, copy and post this public message on Facebook:</p>
      <pre style="white-space: pre-wrap; background: #f8fbff; border: 1px solid #d8e3f0; border-radius: 12px; padding: 14px;">${safeMessage}</pre>
      <p><strong>Step 1:</strong> ${safeDestinationInstruction} Create a new post with the message so admin can find it easily.</p>
      ${groupUrl ? `<p><a href="${groupUrl}">Open ${safeDestinationName}</a></p>` : ""}
      <p><strong>Optional:</strong> You can also comment on the original Facebook garage sale post to promote your SaleTrail listing.</p>
      ${sourceUrl ? `<p><a href="${sourceUrl}">Open original Facebook post</a></p>` : ""}
      <p>After admin approval, you will receive a private manage/edit link. Do not post that private link publicly.</p>
    </div>
  `;

  const text = [
    `Hi ${claimantName},`,
    "",
    `Your claim request for ${listingTitle} is in the admin review queue.`,
    "",
    "To finish the claim, copy and post this public message on Facebook:",
    "",
    message,
    "",
    `Step 1: ${facebookDestinationInstruction({ city, state })} Create a new post with the message so admin can find it easily.`,
    groupUrl ? `${facebookDestination.name}: ${groupUrl}` : "",
    "",
    "Optional: You can also comment on the original Facebook garage sale post to promote your SaleTrail listing.",
    sourceUrl ? `Original post: ${sourceUrl}` : "",
    "",
    "After admin approval, you will receive a private manage/edit link. Do not post that private link publicly.",
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await client.resend.emails.send({
    from: client.from,
    to: claimantEmail,
    subject: `Finish your SaleTrail claim for ${listingTitle}`,
    html,
    text,
  });

  if (error) {
    console.error("Claim instructions email failed", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendClaimApprovedEmail({
  claimantEmail,
  claimantName,
  listingTitle,
  slug,
  city,
  state,
  manageToken,
}: ClaimApprovedEmail) {
  const client = emailClient();
  if (!client) return { sent: false, reason: "Email is not configured." };

  const listingUrl = saleUrl({ slug, city, state });
  const privateManageUrl = manageUrl(manageToken);
  const safeName = escapeHtml(claimantName);
  const safeTitle = escapeHtml(listingTitle);
  const html = `
    <div style="font-family: Arial, sans-serif; color: #20201d; line-height: 1.5;">
      <h1 style="font-size: 24px;">Your SaleTrail listing was approved</h1>
      <p>Hi ${safeName},</p>
      <p>Your claim for <strong>${safeTitle}</strong> was approved.</p>
      <p><a href="${listingUrl}">View your public listing</a></p>
      <p><strong>Private manage/edit link:</strong></p>
      <p><a href="${privateManageUrl}">${privateManageUrl}</a></p>
      <p>Keep this link private. Do not post it publicly.</p>
    </div>
  `;
  const text = [
    `Hi ${claimantName},`,
    "",
    `Your claim for ${listingTitle} was approved.`,
    "",
    `Public listing: ${listingUrl}`,
    "",
    `Private manage/edit link: ${privateManageUrl}`,
    "",
    "Keep this link private. Do not post it publicly.",
  ].join("\n");

  const { error } = await client.resend.emails.send({
    from: client.from,
    to: claimantEmail,
    subject: `Your SaleTrail listing was approved`,
    html,
    text,
  });

  if (error) {
    console.error("Claim approval email failed", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
