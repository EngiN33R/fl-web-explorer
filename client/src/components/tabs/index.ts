import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, queryAll } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

@customElement("tab-host")
export class TabHost extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property()
  tab?: string;

  @property()
  _tabs: Record<string, TemplateResult> = {};
  @property()
  _panes: Record<string, TemplateResult> = {};

  @queryAll("*")
  _children!: NodeListOf<HTMLElement>;

  _initialized = false;

  #clickTab = (e: MouseEvent) => {
    const tab = (e.currentTarget as HTMLElement).dataset.tab;
    if (tab) {
      this.tab = tab;
    }
  };

  render() {
    // console.log(this._children);
    if (!this._initialized) {
      for (const child of this._children) {
        if (child.tagName === "TAB") {
          if (!child.dataset.tab) {
            continue;
          }
          if (!this.tab) {
            this.tab = child.dataset.tab;
          }
          this._tabs[child.dataset.tab] = html`${unsafeHTML(child.innerHTML)}`;
        } else if (child.tagName === "PANE") {
          if (!child.dataset.tab) {
            continue;
          }
          this._panes[child.dataset.tab as string] = html`<div
            data-pane-for="${child.dataset.tab}"
          >
            ${unsafeHTML(child.innerHTML)}
          </div>`;
        }
      }
      this.innerHTML = "";
      this._initialized = true;
    }
    return html`<ul class="tabs">
        ${Object.keys(this._tabs).map(
          (tab) =>
            html`<li>
              <button
                class="${tab === this.tab ? "active" : ""}"
                data-tab="${tab}"
                @click="${this.#clickTab}"
              >
                ${this._tabs[tab]}
              </button>
            </li>`
        )}
      </ul>
      <div class="dynamic-container">
        ${this._panes[this.tab ?? ""] ?? html``}
      </div>`;
  }
}
