import "./style.css";

export * from "./navmap";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <nav-map></nav-map>
  </div>
`;
