import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./search-box";
import "./object-details";

@customElement("map-sidebar")
export class MapSidebar extends LitElement {
  constructor() {
    super();
    this.addEventListener("objectselect", (e) => {
      this.mode = "details";
      this.object = (e as CustomEvent).detail.nickname;
      this.dispatchEvent(
        new CustomEvent("mapnavigate", {
          detail: {
            nickname: this.object,
            system: (e as CustomEvent).detail.system,
          },
        })
      );
    });
  }

  protected createRenderRoot() {
    return this;
  }

  @property()
  object?: string;

  @property()
  mode?: string;

  render() {
    return html`<section class="sidebar-root">
      <search-box></search-box>
      ${this.mode === "details"
        ? html`<object-details object="${this.object}"></object-details>`
        : ""}
    </section>`;
  }
}
