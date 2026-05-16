import { Resend } from "resend";
import { publicClaimMessage, saleUrl } from "./format";

const defaultLocalizedGroupUrl = "https://www.facebook.com/groups/955521984061525";

type ClaimInstructionsEmail = {
  claimantEmail: string;
  claimantName: string;
  listingTitle: string;
  slug: string;
  sourceUrl: string | null;
};

type ClaimApprovedEmail = {
  claimantEmail: string;
  claimantName: string;
  listingTitle: string;
  slug: string;
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

function localizedGroupUrl() {
  return (
    process.env.SALETRAIL_LOCALIZED_FACEBOOK_GROUP_URL ||
    process.env.NEXT_PUBLIC_LOCALIZED_FACEBOOK_GROUP_URL ||
    defaultLocalizedGroupUrl
  );
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
  sourceUrl,
}: ClaimInstructionsEmail) {
  const client = emailClient();
  if (!client) return { sent: false, reason: "Email is not configured." };

  const message = publicClaimMessage(slug);
  const groupUrl = localizedGroupUrl();
  const safeName = escapeHtml(claimantName);
  const safeTitle = escapeHtml(listingTitle);
  const safeMessage = escapeHtml(message);
  const html = `
    <div style="font-family: Arial, sans-serif; color: #20201d; line-height: 1.5;">
      <h1 style="font-size: 24px;">Finish your SaleTrail claim</h1>
      <p>Hi ${safeName},</p>
      <p>Your claim request for <strong>${safeTitle}</strong> is in the admin review queue.</p>
      <p>To finish the claim, copy and post this public message on Facebook:</p>
      <pre style="white-space: pre-wrap; background: #f7f4ee; border: 1px solid #ddd5c7; border-radius: 8px; padding: 14px;">${safeMessage}</pre>
      <p><strong>Step 1:</strong> Post or comment in the Localized.life Facebook group.</p>
      ${groupUrl ? `<p><a href="${groupUrl}">Open Localized.life Facebook group</a></p>` : ""}
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
    "Step 1: Post or comment in the Localized.life Facebook group.",
    groupUrl ? `Localized.life group: ${groupUrl}` : "",
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
  manageToken,
}: ClaimApprovedEmail) {
  const client = emailClient();
  if (!client) return { sent: false, reason: "Email is not configured." };

  const listingUrl = saleUrl(slug);
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
