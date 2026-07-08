(() => {
  const sourceUrl = "https://unpkg.com/mermaid@11.16.0/dist/mermaid.min.js";
  const sourceIntegrity = "sha384-T/0lMUdJpd2S1ZHtRiofG3htU3xPCrFVeAQ1UUE2TJwlEJSV5NUwn30kP28n238E";
  let loadPromise;

  const loadMermaid = () => {
    if (typeof mermaid !== "undefined") return Promise.resolve();
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = sourceUrl;
      script.integrity = sourceIntegrity;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Mermaid could not be loaded")), { once: true });
      document.head.append(script);
    });

    return loadPromise;
  };

  const enhanceDocument = () => {
    if (!document.querySelector(".mermaid")) return;
    loadMermaid().catch((error) => console.error("Mermaid loading failed", error));
  };

  if (typeof document$ !== "undefined") {
    document$.subscribe(enhanceDocument);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceDocument, { once: true });
  } else {
    enhanceDocument();
  }
})();
