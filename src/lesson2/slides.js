const images = import.meta.glob("../../assets/lesson2/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG}", {
  eager: true, query: "?url", import: "default",
});
export const slides = Object.entries(images)
  .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
  .map(([path, src], index) => ({ src, name: path.split("/").pop(), alt: `שיעור 2 – שקופית ${index + 1}` }));
