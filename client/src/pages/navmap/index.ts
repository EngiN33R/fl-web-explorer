import "./style.css";
import "../../components/navmap";
import "../../components/map-sidebar";

window.onload = () => {
  const url = new URL(window.location.href);
  const system = url.searchParams.get("system") ?? "";
  const nickname = url.searchParams.get("nickname") ?? "";
  const navmap = document.getElementById("navmap")!;
  const sidebar = document.getElementById("sidebar")!;
  if (system) {
    navmap.setAttribute("system", system);
  }
  if (nickname) {
    navmap.setAttribute("object", nickname);
    sidebar.setAttribute("object", nickname);
    sidebar.setAttribute("mode", "details");
  }
};

document.addEventListener("objectselect", (e) => {
  const sidebar = document.getElementById("sidebar")!;
  const nickname = (e as CustomEvent).detail.nickname;
  sidebar.setAttribute("object", nickname);
  sidebar.setAttribute("mode", "details");
});
document.addEventListener("mapnavigate", (e) => {
  const system = (e as CustomEvent).detail.system ?? "";
  const nickname = (e as CustomEvent).detail.nickname ?? "";
  const navmap = document.getElementById("navmap")!;
  const sidebar = document.getElementById("sidebar")!;
  navmap.setAttribute("system", system);
  navmap.setAttribute("object", nickname);
  sidebar.setAttribute("object", nickname);

  const url = new URL(window.location.href);
  url.searchParams.set("system", system);
  url.searchParams.set("nickname", nickname);
  history.pushState({}, "", url.toString());
});

window.onpopstate = () => {
  const url = new URL(window.location.href);
  const system = url.searchParams.get("system") ?? "";
  const nickname = url.searchParams.get("nickname") ?? "";
  const sidebar = document.getElementById("sidebar")!;
  const navmap = document.getElementById("navmap")!;
  console.log(system, nickname);
  navmap.setAttribute("system", system);
  navmap.setAttribute("object", nickname);
  sidebar.setAttribute("object", nickname);
  sidebar.setAttribute("mode", "details");
};
