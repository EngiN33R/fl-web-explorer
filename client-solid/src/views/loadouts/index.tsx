import { createResource, createSignal, For } from "solid-js";
import sx from "./loadouts.module.css";
import { IShip } from "../../../../../fl-node-orm/dist";

export function LoadoutsView() {
  const [ship, setShip] = createSignal<IShip | undefined>();
  const [ships] = createResource<IShip[]>(() =>
    fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json())
  );

  return (
    <article class={sx.loadouts}>
      <div class={sx.loadout}>
        <select
          on:change={(e) =>
            setShip(ships()?.find((s) => s.nickname === e.target.value))
          }
        >
          <option hidden disabled selected>
            Select a ship
          </option>
          <For each={ships()}>
            {(ship) => <option value={ship.nickname}>{ship.name}</option>}
          </For>
        </select>
        <ul class={sx.equipment}>
          {ship()?.hardpoints.map((hp) => (
            <li class={sx.equipmentItem}>
              <div>Empty</div>
              <div class={sx.equipmentItemName}>{hp.id}</div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
