export const PREFS_SCRIPT = `(function(){
  try {
    var STEPS = [90, 100, 125, 150, 175];
    var t = localStorage.getItem("praja-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
    var z = parseInt(localStorage.getItem("praja-text-scale") || "100", 10);
    if (isNaN(z) || z < 90 || z > 200) z = 100;
    var best = 100, d = 1e9, idx = 1;
    for (var i = 0; i < STEPS.length; i++) {
      var diff = Math.abs(STEPS[i] - z);
      if (diff < d) { d = diff; best = STEPS[i]; idx = i; }
    }
    document.documentElement.setAttribute("data-text-scale", String(best));
    document.documentElement.style.setProperty("--text-scale", String(best / 100));
    document.documentElement.style.setProperty("--zoom-fill", (idx / (STEPS.length - 1)) * 100 + "%");
  } catch (e) {}
})();`;
