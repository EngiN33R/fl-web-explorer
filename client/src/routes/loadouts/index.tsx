import sx from "./loadouts.module.css";
import { IEquipment, IShip } from "fl-node-orm";
import { useQuery } from "@tanstack/react-query";
import { useReducer, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EquipmentDetail } from "@/components/equipment/equip-detail";
import { groupBy } from "lodash";
import { Ids } from "@/components/ids";

export const Route = createFileRoute("/loadouts/")({
  component: LoadoutsView,
});

type LoadoutAction =
  | {
      type: "set_ship";
      ship: IShip | undefined;
    }
  | {
      type: "set_equipment";
      hardpointId: string;
      equipment: IEquipment;
    };

type LoadoutState = {
  ship: IShip | undefined;
  equipment: Record<string, IEquipment>;
};

function LoadoutsView() {
  const [loadout, dispatchLoadout] = useReducer(
    (state: LoadoutState, action: LoadoutAction) => {
      switch (action.type) {
        case "set_ship":
          return {
            ...state,
            ship: action.ship,
            equipment: {},
          };
        case "set_equipment":
          return {
            ...state,
            equipment: {
              ...state?.equipment,
              [action.hardpointId]: action.equipment,
            },
          };
      }
    },
    {
      ship: undefined,
      equipment: {},
    }
  );

  const [hardpoint, setHardpoint] = useState<string | undefined>();
  const equipmentTypes =
    loadout.ship?.hardpoints
      .filter((hp) => hp.id === hardpoint)
      .map((hp) => hp.type) ?? [];
  const [search, setSearch] = useState("");

  const { data: ships } = useQuery<IShip[]>({
    queryKey: ["ships"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json()),
  });

  const { data: equipment } = useQuery<IEquipment[]>({
    queryKey: ["equipment", JSON.stringify(equipmentTypes)],
    queryFn: async ({ queryKey }) => {
      const hardpoint = queryKey[1] as string | undefined;
      if (!hardpoint) {
        return [];
      }
      const result = await fetch(
        `${import.meta.env.VITE_API_URL}/equip/search?${equipmentTypes.map((type) => `hardpoint[]=${type}`).join("&")}&obtainable=true&limit=0`
      );
      return result.json();
    },
  });

  return (
    <article className={sx.loadouts}>
      <div className={sx.loadout}>
        <select
          onChange={(e) =>
            dispatchLoadout({
              type: "set_ship",
              ship: ships?.find((s) => s.nickname === e.target.value),
            })
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
          {Object.entries(groupBy(loadout.ship?.hardpoints ?? [], "id")).map(
            ([id, hps]) => (
              <li
                key={id}
                className={`${sx.hardpoint} ${hardpoint === id ? sx.active : ""}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setHardpoint(id);
                  }}
                >
                  <div className={sx.name}>
                    {loadout.equipment[id]?.name ?? "Empty"}
                  </div>
                  <div className={sx.caption}>
                    <Ids>{hps[0].type}</Ids>
                  </div>
                </button>
              </li>
            )
          )}
        </ul>
      </div>
      {hardpoint && (
        <aside className={sx.drawer}>
          <button
            className={sx.close}
            onClick={() => {
              setHardpoint(undefined);
              setSearch("");
            }}
          />
          {hardpoint && loadout.equipment[hardpoint] && (
            <EquipmentDetail
              className={sx.detail}
              nickname={loadout.equipment[hardpoint].nickname}
            />
          )}
          <div className={sx.search}>
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ul className={sx.list}>
              {equipment
                ?.filter(
                  (e) =>
                    !search ||
                    e.name.toLowerCase().includes(search.toLowerCase())
                )
                ?.map((e) => (
                  <li key={e.nickname}>
                    <button
                      className={
                        loadout.equipment[hardpoint]?.nickname === e.nickname
                          ? sx.active
                          : ""
                      }
                      onClick={() =>
                        dispatchLoadout({
                          type: "set_equipment",
                          hardpointId: hardpoint,
                          equipment: e,
                        })
                      }
                    >
                      <div className={sx.name}>{e.name}</div>
                      <div className={sx.caption}>{e.nickname}</div>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      )}
    </article>
  );
}
