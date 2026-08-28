export const PREFS_SCRIPT = `(function(){
  try {
    // The in-page text-size slider was removed; drop its saved preference so
    // nothing keeps scaling the page. Browser zoom (Cmd/Ctrl + and -) is the
    // supported way to enlarge text.
    localStorage.removeItem("praja-text-scale");
    document.documentElement.removeAttribute("data-text-scale");
    var t = localStorage.getItem("praja-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();`;
