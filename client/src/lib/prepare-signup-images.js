// The live proxy rejects bodies over 1 MiB. Leave space for multipart fields.
const IMAGE_BUDGET = 960 * 1024;
const MAX_IMAGE_EDGES = [2200, 1800, 1400, 1100, 900];
const JPEG_QUALITIES = [0.9, 0.8, 0.7];

async function fitImage(file, maxBytes) {
  const previewUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    const edges = new Set(MAX_IMAGE_EDGES.map((edge) => Math.min(edge, longestEdge)));

    for (const edge of edges) {
      const scale = edge / longestEdge;
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of JPEG_QUALITIES) {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob?.type === "image/jpeg" && blob.size <= maxBytes) return blob;
      }
    }
    return null;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export async function prepareSignupImages(formData) {
  const uploads = [
    { field: "profile_pic", label: "profile picture" },
    { field: "mist_id_card", label: "MIST ID card" },
  ].map((upload) => ({ ...upload, file: formData.get(upload.field) }));
  const totalBytes = uploads[0].file.size + uploads[1].file.size;
  if (totalBytes <= IMAGE_BUDGET) return "";

  for (const { field, label, file } of uploads) {
    const otherBytes = totalBytes - file.size;
    const maxBytes = Math.max(IMAGE_BUDGET / 2, IMAGE_BUDGET - otherBytes);
    if (file.size <= maxBytes) continue;

    try {
      const image = await fitImage(file, maxBytes);
      if (image) {
        formData.set(field, image, `${field}.jpg`);
        continue;
      }
    } catch {
      return `We couldn't read your ${label}. Choose another JPG or PNG image.`;
    }
    return `Your ${label} is too large to send. Choose a smaller JPG or PNG image.`;
  }
  return "";
}
