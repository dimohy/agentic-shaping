const bar = document.querySelector("#progressBar"),
  toast = document.querySelector("#toast");
addEventListener(
  "scroll",
  () => {
    const m = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${m ? (scrollY / m) * 100 : 0}%`;
  },
  { passive: true },
);
const o = new IntersectionObserver(
  (es) =>
    es.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.08 },
);
document.querySelectorAll(".reveal").forEach((e) => o.observe(e));
document.querySelectorAll("[data-copy]").forEach(
  (b) =>
    (b.onclick = async () => {
      await navigator.clipboard.writeText(
        document.querySelector("#" + b.dataset.copy).innerText.trim(),
      );
      b.textContent = "복사됨";
      toast.classList.add("show");
      setTimeout(() => {
        b.textContent = "복사";
        toast.classList.remove("show");
      }, 1500);
    }),
);
