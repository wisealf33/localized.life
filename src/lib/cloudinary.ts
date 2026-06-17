import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import crypto from "crypto";

type UploadImageOptions = {
  folder?: string;
  prefix?: string;
  tags?: string[];
};

export type CloudinaryImageUpload = {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

let configured = false;

function requireCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dmuyegwxo";
  const apiKey = process.env.CLOUDINARY_API_KEY || "149625262668969";
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    throw new Error("Cloudinary is missing CLOUDINARY_API_SECRET on the server.");
  }

  return { cloudName, apiKey, apiSecret };
}

function cloudinaryClient() {
  if (!configured) {
    const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig();
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

function safeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 120);
}

export async function uploadImageToCloudinary(file: File, options: UploadImageOptions = {}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = safeSegment(options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "localized-life/uploads");
  const fileName = safeSegment(file.name.replace(/\.[^.]+$/, "")) || "image";
  const prefix = safeSegment(options.prefix || "upload") || "upload";
  const publicId = `${prefix}-${crypto.randomUUID().slice(0, 8)}-${fileName}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinaryClient().uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        tags: ["localized-life", ...(options.tags || [])],
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        if (!response) {
          reject(new Error("Cloudinary upload did not return a response."));
          return;
        }
        resolve(response);
      },
    );

    stream.end(buffer);
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  } satisfies CloudinaryImageUpload;
}
