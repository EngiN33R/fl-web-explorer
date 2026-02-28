import { IEquipment, IShip } from "fl-node-orm";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useReducer, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { groupBy } from "lodash";
import { Ids } from "@/components/ids";
import sx from "./loadouts.module.css";
import { decimal, percentage } from "@/util";
import { IShipRes } from "@api/types";
import { EquipmentDrawer } from "@/components/equipment/drawer";

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
          acc.weaponPowerPerSecond +=
            e[e.kind]!.powerUsage / e[e.kind]!.refireRate;
          acc.damageTotalByType[e[e.kind]!.damageType] =
            (acc.damageTotalByType[e[e.kind]!.damageType] ?? 0) +
            e[e.kind]!.shieldDamage;
        }
        return acc;
      },
      {
        damageTotalHull: 0,
        damageTotalShield: 0,
        damagePerSecondHull: 0,
        damagePerSecondShield: 0,
        weaponPowerPerSecond: 0,
        damageTotalByType: {} as Record<string, number>,
      },
    );

    const powerStats = (equipmentGroups.power ?? []).reduce(
      (acc, e) => {
        const power = e.power;
        return {
          powerTotal: acc.powerTotal + (power?.capacity ?? 0),
          powerRegen: acc.powerRegen + (power?.chargeRate ?? 0),
          thrustTotal: acc.thrustTotal + (power?.thrustCapacity ?? 0),
          thrustRegen: acc.thrustRegen + (power?.thrustChargeRate ?? 0),
        };
      },
      { powerTotal: 0, powerRegen: 0, thrustTotal: 0, thrustRegen: 0 },
    );
    const thrusterStats = (equipmentGroups.thruster ?? []).reduce(
      (acc, e) => {
        acc.thrustForce += e.thruster?.maxForce ?? 0;
        acc.thrustPower += e.thruster?.powerUsage ?? 0;
        return acc;
      },
      { thrustForce: 0, thrustPower: 0 },
    );
    const engineStats = (equipmentGroups.engine ?? []).reduce(
      (acc, e) => {
        acc.engineForce += e.engine?.maxForce ?? 0;
        acc.engineLinearDrag += e.engine?.linearDrag ?? 0;
        return acc;
      },
      { engineForce: 0, engineLinearDrag: 0 },
    );
    const shieldStats = (equipmentGroups.shield ?? []).reduce(
      (acc, e) => {
        acc.shieldCapacity += e.shield?.capacity ?? 0;
        acc.shieldRegen += e.shield?.regeneration ?? 0;
        acc.shieldRebuildTime += e.shield?.rebuildTime ?? 0;
        acc.shieldConstantPowerUsage += e.shield?.constantPowerUsage ?? 0;
        acc.shieldRebuildPowerUsage += e.shield?.rebuildPowerUsage ?? 0;
        acc.shieldResistances = {
          ...acc.shieldResistances,
          ...e.shield?.resistances,
        };
        return acc;
      },
      {
        shieldCapacity: 0,
        shieldRegen: 0,
        shieldRebuildTime: 0,
        shieldConstantPowerUsage: 0,
        shieldRebuildPowerUsage: 0,
        shieldResistances: {} as Record<string, number>,
      },
    );

    const shieldMaxPowerUsage =
      shieldStats.shieldConstantPowerUsage +
      shieldStats.shieldRebuildPowerUsage;
    const powerBalance =
      powerStats.powerRegen -
      damageStats.weaponPowerPerSecond -
      shieldMaxPowerUsage;
    const timeToDischarge =
      powerBalance > 0 ? Infinity : powerStats.powerTotal / -powerBalance;

    const totalMass =
      (loadout.ship?.mass ?? 0) + equipment.reduce((acc, e) => acc + e.mass, 0);
    const totalLinearDrag =
      (loadout.ship?.linearDrag ?? 0) + engineStats.engineLinearDrag;
    const maxSpeed = engineStats.engineForce / totalLinearDrag;
    const totalThrustForce =
      equipmentGroups.thruster?.reduce(
        (acc, e) => acc + (e.thruster?.maxForce ?? 0),
        0,
      ) ?? 0;
    const thrustSpeed = totalThrustForce / totalLinearDrag;
    const acceleration = totalThrustForce / totalMass;

    const totalHitPoints =
      (loadout.ship?.hitPoints ?? 0) *
      (equipmentGroups.armor?.reduce((acc, e) => acc + e.armor!.scale, 0) ?? 1);

    return {
      ...damageStats,
      ...shieldStats,
      shieldMaxPowerUsage,
      ...powerStats,
      thrustSpeed,
      thrustBalance: powerStats.thrustRegen - thrusterStats.thrustPower,
      powerBalance,
      timeToDischarge,
      totalHitPoints,
      maxSpeed,
      totalMass,
      acceleration,
    };
  }, [loadout?.equipment]);
};

type LoadoutStats = NonNullable<ReturnType<typeof useLoadoutStats>>;

function Delta<K extends keyof LoadoutStats>({
  current,
  next,
  prop,
  inverse,
  neutral,
  children,
}: {
  current?: LoadoutStats;
  next?: LoadoutStats;
  prop: K;
  inverse?: boolean;
  neutral?: boolean;
  children: (value: LoadoutStats[K], stats: LoadoutStats) => React.ReactNode;
}) {
  if (neutral) {
    const different =
      !!next &&
      JSON.stringify(next?.[prop]) !== JSON.stringify(current?.[prop]);
    return (
      <span className={`${sx.delta} ${different ? sx.neutral : ""}`}>
        {!!current &&
          children(next?.[prop] ?? current[prop], next ?? current)}{" "}
      </span>
    );
  }
  const delta = next
    ? (next[prop] as number) - ((current?.[prop] as number) ?? 0)
    : undefined;
  return (
    <span
      className={`${sx.delta} ${delta ? ((inverse ? delta < 0 : delta > 0) ? sx.positive : sx.negative) : ""}`}
    >
      {!!current && children(next?.[prop] ?? current[prop], next ?? current)}{" "}
      {!!delta &&
        `${delta > 0 ? "+" : "-"}${current?.[prop] === 0 ? "100%" : percentage(Math.abs((next![prop] as number) / (current![prop] as number) - 1))}`}
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
    },
  );

  const [hardpoint, setHardpoint] = useState<string | undefined>();
  const [selected, setSelected] = useState<IEquipment | undefined>();
  const equipmentTypes =
    loadout.ship?.hardpoints
      .filter((hp) => hp.id === hardpoint)
      .map((hp) => hp.type) ?? [];

  const { data: ships } = useQuery<IShipRes[]>({
    queryKey: ["ships"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json()),
  });

  const currentStats = useLoadoutStats(loadout);
  const hoverStats = useLoadoutStats(
    selected && hardpoint
      ? {
          ...loadout,
          equipment: { ...loadout.equipment, [hardpoint]: selected },
        }
      : undefined,
  );
  const stats = hoverStats ?? currentStats;
  const mounted = hardpoint ? loadout.equipment[hardpoint] : undefined;
  const active = selected ?? mounted;

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
                  className={`${sx.hardpoint} ${hardpoint === id ? sx.active : ""} ${hardpoint === id && active?.nickname !== loadout.equipment[id]?.nickname ? sx.pending : ""}`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelected(undefined);
                      setHardpoint(id);
                    }}
                  >
                    <div className={sx.name}>
                      {(hardpoint === id
                        ? active?.name
                        : loadout.equipment[id]?.name) ?? "Empty"}
                    </div>
                    <div className={sx.caption}>
                      <Ids>{hps[0].type}</Ids>
                    </div>
                  </button>
                </li>
              ),
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
            <strong>DMG Profile: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="damageTotalByType"
              neutral
            >
              {(value) => {
                const damageTotalByType = Object.entries(value ?? {}).filter(
                  ([type, damage]) => !type.includes("proto") && damage !== 0,
                );
                return damageTotalByType.length
                  ? damageTotalByType.map(([type, damage], idx) => (
                      <>
                        {percentage(damage / stats!.damageTotalShield)}&nbsp;
                        <Ids>{type}</Ids>
                        {idx < damageTotalByType.length - 1 ? ", " : ""}
                      </>
                    ))
                  : "None";
              }}
            </Delta>
          </li>
          <hr />
          <li>
            <strong>Hit Points: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="totalHitPoints"
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
            <strong>Shield DMG Mult: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="shieldResistances"
              neutral
            >
              {(value) => {
                const shieldDmgMults = Object.entries(value ?? {}).filter(
                  ([type, mult]) =>
                    !type.includes("proto") && mult !== 1 && mult !== 0,
                );
                return shieldDmgMults.length
                  ? shieldDmgMults.map(([type, resistance], idx) => (
                      <>
                        {percentage(resistance)}&nbsp;<Ids>{type}</Ids>
                        {idx < shieldDmgMults.length - 1 ? ", " : ""}
                      </>
                    ))
                  : "None";
              }}
            </Delta>
          </li>
          <li>
            <strong>Shield Rebuild Time: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="shieldRebuildTime"
              inverse
            >
              {(value) => `${decimal(value)}s`}
            </Delta>
          </li>
          <hr />
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
              {(value) => `${decimal(value)}/s`}
            </Delta>
          </li>
          <li>
            <strong>Time to Discharge: </strong>
            <Delta
              current={currentStats}
              next={hoverStats}
              prop="timeToDischarge"
            >
              {(value) => (value == Infinity ? "∞" : `${decimal(value)}s`)}
            </Delta>
          </li>
          <hr />
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
            <strong>Max Speed: </strong>
            <Delta current={currentStats} next={hoverStats} prop="maxSpeed">
              {(value) => `${decimal(value)} m/s`}
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
          <li>
            <strong>Acceleration: </strong>
            <Delta current={currentStats} next={hoverStats} prop="acceleration">
              {(value) => `${decimal(value)} m/s²`}
            </Delta>
          </li>
        </ul>
      </section>
      {hardpoint && (
        <EquipmentDrawer
          className={sx.drawer}
          onClose={() => {
            setHardpoint(undefined);
            setSelected(undefined);
          }}
          onSelect={(e) => setSelected(e)}
          onConfirm={(e) =>
            dispatchLoadout({
              type: "set_equipment",
              hardpointId: hardpoint,
              equipment: e,
            })
          }
          value={active}
          acceptDisabled={active?.nickname === mounted?.nickname}
          types={equipmentTypes}
        />
      )}
    </article>
  );
}
