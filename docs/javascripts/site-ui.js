(() => {
  let resizeTimer;

  const nearestHeading = (wrapper) => {
    const headings = [...document.querySelectorAll("main h1, main h2, main h3, main h4")];
    const prior = headings.filter(
      (heading) => heading.compareDocumentPosition(wrapper) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    return prior.at(-1)?.textContent.replace("¶", "").trim() || "Data";
  };

  const updateTableRegions = () => {
    const labelCounts = new Map();
    document.querySelectorAll(".md-typeset__table").forEach((wrapper) => {
      const heading = nearestHeading(wrapper);
      const count = (labelCounts.get(heading) || 0) + 1;
      labelCounts.set(heading, count);
      const suffix = count > 1 ? `, table ${count}` : "";
      const overflows = wrapper.scrollWidth > wrapper.clientWidth + 2;

      if (overflows) {
        wrapper.tabIndex = 0;
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", `Scrollable table: ${heading}${suffix}`);
      } else {
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("aria-label");
      }
    });
  };

  const enhanceDocument = () => {
    const search = document.querySelector('[data-md-component="search-query"]');
    if (search) {
      search.placeholder = "Search claims, anchors, and contracts";
      search.setAttribute("aria-label", "Search claims, anchors, and reconstructed contracts");
    }

    document.body.dataset.mdPage = document.querySelector(".atlas-hero") ? "home" : "article";

    document.querySelectorAll('.md-content a[href*="github.com/swyxio/claude-code-internals/blob/main/"]').forEach((link) => {
      link.classList.add("atlas-source-link");
      if (link.href.includes("/evidence/")) link.dataset.atlasSource = "evidence";
      if (link.href.includes("/reconstructed/")) link.dataset.atlasSource = "reconstruction";
    });

    requestAnimationFrame(updateTableRegions);
  };

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateTableRegions, 120);
  });

  if (typeof document$ !== "undefined") {
    document$.subscribe(enhanceDocument);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceDocument, { once: true });
  } else {
    enhanceDocument();
  }
})();
