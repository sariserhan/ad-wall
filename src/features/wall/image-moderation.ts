export async function bakeImageForModeration(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new window.Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Could not load the image."));
      node.src = url;
    });
    const naturalWidth = image.naturalWidth || 1;
    const naturalHeight = image.naturalHeight || 1;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not process the image."));
          return;
        }
        resolve(result);
      }, "image/jpeg", 0.82);
    });
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-moderation.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
