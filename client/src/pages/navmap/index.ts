import "./style.css";
import "../../components/navmap";
import "../../components/map-sidebar";

document.getElementById("navmap")!.addEventListener("objectselect", (e) => {
  const sidebar = document.getElementById("sidebar")!;
  const nickname = (e as CustomEvent).detail.nickname;
  sidebar.setAttribute("object", nickname);
  sidebar.setAttribute("mode", "details");
});
document.getElementById("sidebar")!.addEventListener("mapnavigate", (e) => {
  document
    .getElementById("navmap")!
    .setAttribute("system", (e as CustomEvent).detail.system);
});
