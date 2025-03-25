import "./style.css";

window.onunhandledrejection = function (e) {
  console.error(e);
};

export * from "./navmap/index";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <nav-map></nav-map>
  </div>
`;
