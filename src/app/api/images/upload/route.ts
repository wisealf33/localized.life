import { NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { optimizedImageUrl } from "@/lib/images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.getAll("photos").find((item) => item instanceof File);

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    }

    const folder = String(formData.get("folder") || process.env.CLOUDINARY_UPLOAD_FOLDER || "localized-life/uploads");
    const prefix = String(formData.get("prefix") || formData.get("slug") || "upload");
    const uploaded = await uploadImageToCloudinary(file, {
      folder,
      prefix,
      tags: ["manual-upload"],
    });

    return NextResponse.json({
      publicId: uploaded.publicId,
      optimizedUrl: optimizedImageUrl(uploaded.publicId, { width: 1600, crop: "limit" }),
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image upload failed." },
      { status: 500 },
    );
  }
}
