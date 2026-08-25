const locale = document.body.dataset.locale || "en";
const messages = {
  en: { copy: "Copy", copied: "Copied", version: "Current public version", language: "Language" },
  ko: { copy: "복사", copied: "복사됨", version: "현재 공개 버전", language: "언어" },
  ja: { copy: "コピー", copied: "コピー済み", version: "現在の公開バージョン", language: "言語" },
  zh: { copy: "复制", copied: "已复制", version: "当前公开版本", language: "语言" },
};
const text = messages[locale] || messages.en;
const routes = { en: "", ko: "ko/", ja: "ja/", zh: "zh/" };
const storageKey = "agentic-shaping-language";
const rootUrl = new URL(document.querySelector('meta[name="site-root"]')?.content || "./", location.href);
const normalizeLanguage = value => {
  const language = String(value || "").toLowerCase().split("-")[0];
  return ["ko", "ja", "zh"].includes(language) ? language : "en";
};
const requestedLanguage = new URLSearchParams(location.search).get("lang");
const requestedLocale = requestedLanguage && routes[normalizeLanguage(requestedLanguage)] !== undefined
  ? normalizeLanguage(requestedLanguage)
  : null;
if (requestedLocale) localStorage.setItem(storageKey, requestedLocale);

const isRootPage = locale === "en";
const savedValue = localStorage.getItem(storageKey);
const savedLocale = routes[savedValue] !== undefined ? savedValue : null;
const detectedLocale = (navigator.languages || [navigator.language])
  .map(normalizeLanguage)
  .find(candidate => routes[candidate] !== undefined) || "en";
const desiredLocale = requestedLocale || (isRootPage ? savedLocale || detectedLocale : locale);

if (desiredLocale !== locale) {
  const target = new URL(routes[desiredLocale], rootUrl);
  target.searchParams.set("lang", desiredLocale);
  target.hash = location.hash;
  location.replace(target);
} else if (!savedLocale && !isRootPage) {
  localStorage.setItem(storageKey, locale);
}

document.querySelectorAll("[data-language]").forEach(link => {
  const language = link.dataset.language;
  const target = new URL(routes[language], rootUrl);
  target.searchParams.set("lang", language);
  target.hash = location.hash;
  link.href = target.href;
  link.parentElement.setAttribute("aria-label", text.language);
  if (language === locale) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});

const bar = document.querySelector("#progressBar"),
  toast = document.querySelector("#toast");
const siteVersion = document.querySelector(
  'meta[name="application-version"]',
)?.content;
if (!/^v\d+\.\d+$/.test(siteVersion ?? "")) {
  throw new Error("A valid Agentic Shaping public version was not found.");
}
document.querySelectorAll("[data-site-version]").forEach((element) => {
  element.textContent = siteVersion;
  element.setAttribute("aria-label", `${text.version} ${siteVersion}`);
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
  (b) => {
    b.textContent = text.copy;
    (b.onclick = async () => {
      await navigator.clipboard.writeText(
        document.querySelector("#" + b.dataset.copy).innerText.trim(),
      );
      b.textContent = text.copied;
      toast.classList.add("show");
      setTimeout(() => {
        b.textContent = text.copy;
        toast.classList.remove("show");
      }, 1500);
    });
  },
);
