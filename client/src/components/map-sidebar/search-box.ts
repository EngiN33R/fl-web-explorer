import { Task } from "@lit/task";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("search-box")
export class SearchBox extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property()
  query?: string;

  #timeout = 0;

  #searchTask = new Task(this, {
    task: async ([query], { signal }) => {
      if (!query) {
        return [];
      }

      return new Promise((resolve, reject) => {
        if (this.#timeout) {
          clearTimeout(this.#timeout);
        }
        this.#timeout = setTimeout(async () => {
          const response = await fetch(
            `http://localhost:3000/search?q=${query ?? ""}`,
            {
              signal,
            }
          );

          if (!response.ok) {
            reject(new Error(`HTTP error ${response.status}`));
          }

          this.#timeout = 0;
          const result = await response.json();
          resolve(result);
        }, 500);
      });
    },
    args: () => [this.query],
    autoRun: true,
  });

  #objectClicked = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    this.query = "";
    (this.querySelector("#search-input") as HTMLInputElement).value = "";
    this.dispatchEvent(
      new CustomEvent("objectselect", {
        detail: {
          nickname: target.dataset.nickname,
          system: target.dataset.system,
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    const resultRender = this.#searchTask.render({
      pending: () =>
        html`<ul id="result-set">
          <li><span class="status">Loading...</span></li>
        </ul>`,
      complete: (result: readonly any[]) => {
        if (!this.query) {
          return "";
        }
        const best = result.filter((r) => r.relevance > 2.5).slice(0, 10);
        if (best.length === 0) {
          return html`<ul id="result-set">
            <li><span class="status">No results</span></li>
          </ul>`;
        }
        return html`<ul id="result-set">
          ${best.map(
            (e: any) =>
              html`<li data-relevance="${e.relevance}">
                <button
                  class="result"
                  data-nickname="${e.nickname}"
                  data-system="${e.system?.nickname ?? e.nickname}"
                  @click="${this.#objectClicked}"
                >
                  ${e.name}
                  ${e.system &&
                  html`<small>${e.system?.name}, Sector A1</small>`}
                </button>
              </li>`
          )}
        </ul>`;
      },
    });

    return html`
      <div id="search-container" part="container">
        <input
          id="search-input"
          type="search"
          placeholder="Search..."
          @input=${(e: Event) => {
            this.query = (e.target as HTMLInputElement).value;
          }}
        />
        ${resultRender}
      </div>
    `;
  }
}
