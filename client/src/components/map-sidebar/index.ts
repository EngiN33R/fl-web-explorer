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
          bubbles: true,
          composed: true,
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

  #goBack = () => {
    history.back();
  };

  render() {
    return html`<section class="sidebar-root">
      <search-box></search-box>
      ${this.object
        ? html`<button class="back" @click="${this.#goBack}">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
              />
            </svg>
          </button>`
        : ""}
      ${this.mode === "details"
        ? html`<object-details object="${this.object}"></object-details>`
        : ""}
    </section>`;
  }
}
