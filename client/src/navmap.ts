import { Task } from "@lit/task";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("nav-map")
export class SimpleGreeting extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      .navmap-root {
        position: relative;
        width: 800px;
        height: 800px;
        background-color: black;

        .system {
          background-color: white;
          border: 1px solid black;
          border-radius: 100%;
          width: 10px;
          height: 10px;

          .system-name {
            position: absolute;
          }
        }
      }
    }
  `;

  // Declare reactive properties
  @property()
  system?: string | null = null;

  #universeTask = new Task(this, {
    task: async (_, { signal }) => {
      const response = await fetch(`http://localhost:3000/universe`, {
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return response.json();
    },
    args: () => [],
  });

  render() {
    return this.#universeTask.render({
      pending: () => html`<p>Loading product...</p>`,
      complete: (results) => {
        if (!this.system) {
          return html`<section class="navmap-root">
            ${results.map(
              (r) =>
                html`<div
                  class="system"
                  style="position: absolute; left: ${r.position[0] *
                  50}px; top: ${r.position[1] * 50}px"
                >
                  <span class="system-name">${r.name}</span>
                </div>`
            )}
          </section>`;
        }

        return html`<section
          class="navmap-root"
          data-system="${this.system}"
        ></section>`;
      },
      error: (e) => html`<p>Error: ${e}</p>`,
    });
  }
}
