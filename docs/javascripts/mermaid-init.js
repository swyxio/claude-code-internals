(() => {
  const render = () => {
    if (typeof mermaid === "undefined") return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
    mermaid.run({ querySelector: ".mermaid" }).catch((error) => {
      console.error("Mermaid rendering failed", error);
    });
  };

  if (typeof document$ !== "undefined") {
    document$.subscribe(render);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
