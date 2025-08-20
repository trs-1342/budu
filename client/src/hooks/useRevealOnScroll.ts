import { useEffect } from "react";

export default function useRevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            // Bir kere görünsün, kaydıra kaydıra dönmesin:
            io.unobserve(el);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );

    // Hem .reveal hem de [data-reveal] hedefleri otomatik al
    const candidates = document.querySelectorAll<HTMLElement>(
      ".reveal, [data-reveal]"
    );
    candidates.forEach((el) => io.observe(el));

    // Stagger için indeks ata (var(--i))
    document
      .querySelectorAll<HTMLElement>("[data-reveal-group] > *")
      .forEach((el, i) => {
        el.style.setProperty("--i", i.toString());
      });

    return () => io.disconnect();
  }, []);
}
