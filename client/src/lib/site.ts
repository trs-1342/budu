// src/lib/site.ts
export function getSiteName() {
  const meta = document.querySelector(
    'meta[name="site-name"]'
  ) as HTMLMetaElement | null;
  return (meta?.content || document.title || "Budu").trim();
}

/** İstersen title’ı da otomatik senkronla */
export function applySiteNameToTitle() {
  const name = getSiteName();
  if (name && document.title !== name) document.title = name;
}
