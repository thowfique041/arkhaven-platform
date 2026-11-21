import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env";
import { ApiError } from "../utils/http";

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface StoredFile {
  url: string;
  publicId: string;
}

export async function uploadBuffer(file: Express.Multer.File, subfolder: string): Promise<StoredFile> {
  if (!env.cloudinaryEnabled) {
    throw new ApiError(
      503,
      "Image uploads are not configured. Add Cloudinary credentials to the server environment, or paste an image URL instead.",
      "UPLOADS_DISABLED",
    );
  }
  const res = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${subfolder}`,
        resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
        overwrite: false,
        unique_filename: true,
      },
      (err, result) => (err || !result ? reject(err ?? new Error("Upload failed")) : resolve(result)),
    );
    stream.end(file.buffer);
  });
  return { url: res.secure_url, publicId: res.public_id };
}

export async function deleteStored(publicId?: string | null) {
  if (!publicId || !env.cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.warn("Cloudinary delete failed", publicId, e);
  }
}
