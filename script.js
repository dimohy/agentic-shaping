const bar = document.querySelector("#progressBar"),
  toast = document.querySelector("#toast");
const siteVersion = document.querySelector(
  'meta[name="application-version"]',
)?.content;
if (!/^v\d+\.\d+$/.test(siteVersion ?? "")) {
  throw new Error("올바른 Agentic Shaping 공개 버전을 찾지 못했습니다.");
}
document.querySelectorAll("[data-site-version]").forEach((element) => {
  element.textContent = siteVersion;
  element.setAttribute("aria-label", `현재 공개 버전 ${siteVersion}`);
});
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
