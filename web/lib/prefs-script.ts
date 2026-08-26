export const PREFS_SCRIPT = `(function(){
  var STEPS=[90,100,125,150,175];
  var NAMES=["Smaller","Default","Large","Larger","Largest"];
  function nearest(v){var best=100,d=1e9;for(var i=0;i<STEPS.length;i++){var n=Math.abs(STEPS[i]-v);if(n<d){d=n;best=STEPS[i];}}return best;}
  function indexOfZoom(z){var i=STEPS.indexOf(nearest(z));return i<0?1:i;}
  function currentTheme(){return document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light";}
  function currentZoom(){return nearest(parseInt(document.documentElement.getAttribute("data-text-scale")||"100",10));}
  function fillFor(i){return (i/(STEPS.length-1))*100+"%";}
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme",t);
    try{localStorage.setItem("praja-theme",t);}catch(e){}
    document.querySelectorAll(".a11y-theme").forEach(function(btn){
      var dark=t==="dark";
      btn.setAttribute("aria-pressed",dark?"true":"false");
      btn.setAttribute("aria-label",dark?"Switch to light appearance":"Switch to dark appearance");
    });
    try{window.dispatchEvent(new Event("praja-prefs"));}catch(e){}
  }
  function applyZoom(z){
    z=nearest(z);
    var i=indexOfZoom(z);
    document.documentElement.setAttribute("data-text-scale",String(z));
    document.documentElement.style.setProperty("--text-scale",String(z/100));
    document.documentElement.style.setProperty("--zoom-fill",fillFor(i));
    try{localStorage.setItem("praja-text-scale",String(z));}catch(e){}
    document.querySelectorAll(".a11y-zoom-slider").forEach(function(el){
      el.value=String(i);
      el.setAttribute("aria-valuetext",NAMES[i]);
    });
    var live=document.querySelector(".a11y-dock .sr-only");
    if(live) live.textContent=NAMES[i]+" text size. "+(currentTheme()==="dark"?"Dark":"Light")+" appearance.";
    try{window.dispatchEvent(new Event("praja-prefs"));}catch(e){}
  }
  try{
    var t=localStorage.getItem("praja-theme");
    if(t!=="light"&&t!=="dark") t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
    applyTheme(t);
    var z=parseInt(localStorage.getItem("praja-text-scale")||"100",10);
    if(isNaN(z)||z<90||z>200) z=100;
    applyZoom(z);
  }catch(e){applyTheme("light");applyZoom(100);}
  function ready(){
    applyTheme(currentTheme());
    applyZoom(currentZoom());
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        document.documentElement.setAttribute("data-prefs-ready","true");
      });
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",ready);
  else ready();
  document.addEventListener("click",function(event){
    var node=event.target;
    if(node&&node.nodeType!==1) node=node.parentElement;
    if(!node||!node.closest) return;
    var themeBtn=node.closest(".a11y-theme");
    if(themeBtn) applyTheme(currentTheme()==="dark"?"light":"dark");
  });
  document.addEventListener("input",function(event){
    var slider=event.target&&event.target.closest&&event.target.closest(".a11y-zoom-slider");
    if(!slider) return;
    var i=parseInt(slider.value,10);
    if(isNaN(i)) i=1;
    i=Math.max(0,Math.min(STEPS.length-1,i));
    applyZoom(STEPS[i]);
  });
})();`;
