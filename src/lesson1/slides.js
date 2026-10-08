// Vite emits the original files unchanged. Only the current image is requested by the viewer.
const images = import.meta.glob(
  "../../assets/lesson1/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

export const slides = Object.entries(images)
  .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
  .map(([path, src], index) => ({
    src,
    name: path.split("/").pop(),
    alt: `שיעור 1 – שקופית ${index + 1}`,
  }));
