import sx from "./loadouts.module.css";
import { IEquipment, IShip } from "fl-node-orm";
import { useQuery } from "@tanstack/react-query";
import { useReducer, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

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
          console.log(action.hardpointId, action.equipment);
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

  const [hardpoint, setHardpoint] = useState<
    { id: string; type: string } | undefined
  >();
  const [search, setSearch] = useState("");

  const { data: ships } = useQuery<IShip[]>({
    queryKey: ["ships"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json()),
  });
  const { data: equipment } = useQuery<IEquipment[]>({
    queryKey: ["equipment", hardpoint?.type],
    queryFn: async ({ queryKey }) => {
      const hardpoint = queryKey[1] as string | undefined;
      if (!hardpoint) {
        return [];
      }
      const result = await fetch(
        `${import.meta.env.VITE_API_URL}/equip/search?hardpoint=${hardpoint}&limit=0`
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
          {loadout.ship?.hardpoints.map((hp) => (
            <li
              key={hp.id}
              className={`${sx.hardpoint} ${hardpoint?.id === hp.id ? sx.active : ""}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setHardpoint(hp);
                }}
              >
                <div className={sx.name}>
                  {loadout.equipment[hp.id]?.name ?? "Empty"}
                </div>
                <div className={sx.caption}>{hp.type}</div>
              </button>
            </li>
          ))}
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
          {hardpoint && loadout.equipment[hardpoint.id] && (
            <div className={sx.detail}>
              <div className={sx.name}>
                {loadout.equipment[hardpoint.id].name}
              </div>
              <div
                className={sx.description}
                dangerouslySetInnerHTML={{
                  __html: loadout.equipment[hardpoint.id].infocard,
                }}
              />
            </div>
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
                        loadout.equipment[hardpoint.id]?.nickname === e.nickname
                          ? sx.active
                          : ""
                      }
                      onClick={() =>
                        dispatchLoadout({
                          type: "set_equipment",
                          hardpointId: hardpoint.id,
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
