import { IEquipment, IShip } from "fl-node-orm";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useReducer, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EquipmentDetail } from "@/components/equipment/equip-detail";
import { groupBy } from "lodash";
import { Ids } from "@/components/ids";
import sx from "./loadouts.module.css";
import { decimal, percentage } from "@/util";
import { IShipRes } from "@api/types";

export const Route = createFileRoute("/loadouts/")({
  component: LoadoutsView,
});

type LoadoutAction =
  | {
      type: "set_ship";
      ship: IShip | undefined;
      equipment?: Record<string, IEquipment>;
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

const useLoadoutStats = (loadout: LoadoutState | undefined) => {
  return useMemo(() => {
    if (!loadout) {
      return undefined;
    }

    const equipment = Object.values(loadout.equipment);
    const equipmentGroups = groupBy(equipment, (e) => e.kind) as Record<
      IEquipment["kind"],
      IEquipment[]
    >;

    const totalMass = equipment.reduce((acc, e) => acc + e.mass, 0);
    const powerStats = equipmentGroups.power?.reduce(
      (acc, e) => {
        const power = e.power;
        return {
          powerTotal: acc.powerTotal + (power?.capacity ?? 0),
          powerRegen: acc.powerRegen + (power?.chargeRate ?? 0),
          thrustTotal: acc.thrustTotal + (power?.thrustCapacity ?? 0),
          thrustRegen: acc.thrustRegen + (power?.thrustChargeRate ?? 0),
        };
      },
      { powerTotal: 0, powerRegen: 0, thrustTotal: 0, thrustRegen: 0 }
    );
    const thrusterStats = equipmentGroups.thruster?.reduce(
      (acc, e) => {
        acc.thrustSpeed += e.thruster?.speed ?? 0;
        acc.thrustPower += e.thruster?.powerUsage ?? 0;
        return acc;
      },
      { thrustSpeed: 0, thrustPower: 0 }
    );

    const damageStats = equipment.reduce(
      (acc, e) => {
        if (
          e.kind !== "gun" &&
          e.kind !== "turret" &&
          e.kind !== "missile" &&
          e.kind !== "mine"
        ) {
          return acc;
        }

        acc.damageTotalHull += e[e.kind]!.hullDamage;
        acc.damageTotalShield += e[e.kind]!.shieldDamage;
        acc.damagePerSecondHull +=
          e[e.kind]!.hullDamage / e[e.kind]!.refireRate;
        acc.damagePerSecondShield +=
          e[e.kind]!.shieldDamage / e[e.kind]!.refireRate;
        if (e.kind === "gun" || e.kind === "turret") {
          acc.powerUsage += e[e.kind]!.powerUsage / e[e.kind]!.refireRate;
        }
        return acc;
      },
      {
        damageTotalHull: 0,
        damageTotalShield: 0,
        damagePerSecondHull: 0,
        damagePerSecondShield: 0,
        powerUsage: 0,
      }
    );
    const shieldStats = equipmentGroups.shield?.reduce(
      (acc, e) => {
        acc.shieldCapacity += e.shield?.capacity ?? 0;
        acc.shieldRegen += e.shield?.regeneration ?? 0;
        return acc;
      },
      { shieldCapacity: 0, shieldRegen: 0 }
    );

    const powerBalance =
      (powerStats?.powerRegen ?? 0) - (damageStats?.powerUsage ?? 0);

    return {
      totalMass,
      damageTotalHull: damageStats.damageTotalHull ?? 0,
      damageTotalShield: damageStats.damageTotalShield ?? 0,
      damagePerSecondHull: damageStats.damagePerSecondHull ?? 0,
      damagePerSecondShield: damageStats.damagePerSecondShield ?? 0,
      powerBalance,
      powerTotal: powerStats?.powerTotal ?? 0,
      powerRegen: powerStats?.powerRegen ?? 0,
      shieldCapacity: shieldStats?.shieldCapacity ?? 0,
      shieldRegen: shieldStats?.shieldRegen ?? 0,
      thrustTotal: powerStats?.thrustTotal ?? 0,
      thrustRegen: powerStats?.thrustRegen ?? 0,
      thrustSpeed: thrusterStats?.thrustSpeed ?? 0,
      thrustBalance:
        (powerStats?.thrustRegen ?? 0) - (thrusterStats?.thrustPower ?? 0),
    };
  }, [loadout?.equipment]);
};

type LoadoutStats = NonNullable<ReturnType<typeof useLoadoutStats>>;

function Delta({
  current,
  next,
  prop,
  inverse,
  children,
}: {
  current?: LoadoutStats;
  next?: LoadoutStats;
  prop: keyof LoadoutStats;
  inverse?: boolean;
  children: (value: number, stats: LoadoutStats) => React.ReactNode;
}) {
  const delta = next ? next[prop] - (current?.[prop] ?? 0) : undefined;
  return (
    <span
      className={`${sx.delta} ${delta ? ((inverse ? delta < 0 : delta > 0) ? sx.positive : sx.negative) : ""}`}
    >
      {!!current && children(next?.[prop] ?? current[prop], next ?? current)}{" "}
      {!!delta &&
        `${delta > 0 ? "+" : "-"}${current?.[prop] === 0 ? "100%" : percentage(Math.abs(next![prop] / current![prop] - 1))}`}
    </span>
  );
}

function LoadoutsView() {
  const [loadout, dispatchLoadout] = useReducer(
    (state: LoadoutState, action: LoadoutAction) => {
      switch (action.type) {
        case "set_ship":
          return {
            ...state,
            ship: action.ship,
            equipment: { ...action.equipment },
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
  const [selected, setSelected] = useState<IEquipment | undefined>();
  const equipmentTypes =
    loadout.ship?.hardpoints
      .filter((hp) => hp.id === hardpoint)
      .map((hp) => hp.type) ?? [];
  const [search, setSearch] = useState("");

  const { data: ships } = useQuery<IShipRes[]>({
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

  const currentStats = useLoadoutStats(loadout);
  const hoverStats = useLoadoutStats(
    selected && hardpoint
      ? {
          ...loadout,
          equipment: { ...loadout.equipment, [hardpoint]: selected },
        }
      : undefined
  );
  const active =
    selected ?? (hardpoint ? loadout.equipment[hardpoint] : undefined);

  return (
    <article className={sx.loadouts}>
      <section className={sx.player}>
        <div className={sx.loadout}>
          <select
            className={`${sx.ship} ${loadout.ship ? "" : sx.placeholder}`}
            onChange={(e) => {
              const ship = ships?.find((s) => s.nickname === e.target.value);
              if (!ship) {
                return;
              }
              dispatchLoadout({
                type: "set_ship",
                ship,
                equipment: ship.loadout,
              });
            }}
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
        <ul className={sx.stats}>
          <h3>Stats</h3>
          <li>
            <strong>DPS (Hull): </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="damagePerSecondHull"
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>DPS (Shield): </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="damagePerSecondShield"
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Total DMG (Hull): </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="damageTotalHull"
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Total DMG (Shield): </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="damageTotalShield"
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Shield Capacity: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="shieldCapacity"
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Shield Regen: </strong>
            <Delta current={currentStats} next={hoverStats} prop="shieldRegen">
              {(value) => `${decimal(value)}/s`}
            </Delta>
          </li>
          <li>
            <strong>Power Capacity: </strong>
            <Delta current={currentStats} next={hoverStats} prop="powerTotal">
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Power Charge Rate: </strong>
            <Delta current={currentStats} next={hoverStats} prop="powerRegen">
              {(value) => `${decimal(value)}/s`}
            </Delta>
          </li>
          <li>
            <strong>Power Balance: </strong>
            <Delta current={currentStats} next={hoverStats} prop="powerBalance">
              {(value, stats) =>
                `${decimal(value)}/s (${value >= 0 ? "∞" : decimal((stats?.powerTotal ?? 0) / -(stats?.powerBalance ?? 0)) + "s"})`
              }
            </Delta>
          </li>
          <li>
            <strong>Thruster Speed: </strong>
            <Delta current={currentStats} next={hoverStats} prop="thrustSpeed">
              {(value) => `${decimal(value)} m/s`}
            </Delta>
          </li>
          <li>
            <strong>Thruster Capacity: </strong>
            <Delta current={currentStats} next={hoverStats} prop="thrustTotal">
              {(value) => decimal(value)}
            </Delta>
          </li>
          <li>
            <strong>Thruster Charge Rate: </strong>
            <Delta current={currentStats} next={hoverStats} prop="thrustRegen">
              {(value) => `${decimal(value)}/s`}
            </Delta>
          </li>
          <li>
            <strong>Thruster Balance: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="thrustBalance"
            >
              {(value, stats) =>
                `${decimal(value)}/s (${value >= 0 ? "∞" : decimal((stats?.thrustTotal ?? 0) / -(stats?.thrustBalance ?? 0)) + "s"})`
              }
            </Delta>
          </li>
          <li>
            <strong>Mass: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="totalMass"
              inverse
            >
              {(value) => decimal(value)}
            </Delta>
          </li>
        </ul>
      </section>
      {hardpoint && (
        <aside className={sx.drawer}>
          <div className={sx.actions}>
            <button
              className={`${sx.action} ${sx.accept}`}
              onClick={() => {
                if (hardpoint && active) {
                  dispatchLoadout({
                    type: "set_equipment",
                    hardpointId: hardpoint,
                    equipment: active,
                  });
                  setHardpoint(undefined);
                  setSelected(undefined);
                  setSearch("");
                }
              }}
            />
            <button
              className={`${sx.action} ${sx.close}`}
              onClick={() => {
                setHardpoint(undefined);
                setSelected(undefined);
                setSearch("");
              }}
            />
          </div>
          {active && (
            <EquipmentDetail className={sx.detail} nickname={active.nickname} />
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
                        active?.nickname === e.nickname ? sx.active : ""
                      }
                      onClick={() => {
                        setSelected(e);
                      }}
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
