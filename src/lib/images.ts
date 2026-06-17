const defaultCloudinaryCloudName = "dmuyegwxo";
const cloudinaryUploadSegment = "/image/upload/";

type OptimizedImageOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "scale";
};

function cloudinaryCloudName() {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || defaultCloudinaryCloudName;
}

function stripImageExtension(value: string) {
  return value.replace(/\.(avif|gif|jpe?g|png|webp)$/i, "");
}

export function cloudinaryPublicIdFromSource(source: string | null | undefined) {
  const value = String(source || "").trim();
  if (!value || value.startsWith("/") || value.startsWith("data:")) return null;

  try {
    const parsed = new URL(value);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    const afterUpload = parsed.pathname.split(cloudinaryUploadSegment)[1];
    if (!afterUpload) return null;

    const parts = afterUpload.split("/").filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const publicIdParts =
      versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts.slice(parts[0]?.includes(",") ? 1 : 0);

    return publicIdParts.length ? stripImageExtension(decodeURIComponent(publicIdParts.join("/"))) : null;
  } catch {
    if (value.includes("://")) return null;
    return stripImageExtension(value.replace(/^\/+/, ""));
  }
}

export function optimizedImageUrl(source: string, options: OptimizedImageOptions = {}) {
  const publicId = cloudinaryPublicIdFromSource(source);
  if (!publicId) return source;

  const transformations = [
    "f_auto",
    "q_auto",
    options.width ? `w_${Math.round(options.width)}` : null,
    options.height ? `h_${Math.round(options.height)}` : null,
    options.crop ? `c_${options.crop}` : null,
  ].filter(Boolean);

  return `https://res.cloudinary.com/${cloudinaryCloudName()}/image/upload/${transformations.join(",")}/${publicId}`;
}
