import sx from "./loadouts.module.css";
import { IShip } from "../../../../../fl-node-orm/dist";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loadouts/")({
  component: LoadoutsView,
});

function LoadoutsView() {
  const [ship, setShip] = useState<IShip | undefined>();
  const { data: ships } = useQuery<IShip[]>({
    queryKey: ["ships"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json()),
  });

  return (
    <article className={sx.loadouts}>
      <div className={sx.loadout}>
        <select
          onChange={(e) =>
            setShip(ships?.find((s) => s.nickname === e.target.value))
          }
        >
          <option hidden disabled selected>
            Select a ship
          </option>
          {ships?.map((ship) => (
            <option value={ship.nickname}>{ship.name}</option>
          ))}
        </select>
        <ul className={sx.equipment}>
          {ship?.hardpoints.map((hp) => (
            <li className={sx.equipmentItem}>
              <div>Empty</div>
              <div className={sx.equipmentItemName}>{hp.id}</div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
