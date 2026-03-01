import { groupBy } from "lodash";
import { ILoadoutRes } from "../types";
import { IEquipment } from "fl-node-orm";

export function calculateLoadoutStats(loadout: ILoadoutRes) {
  const equipment = Object.values(loadout.equipment).filter(
    Boolean,
  ) as IEquipment[];
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
      acc.damagePerSecondHull += e[e.kind]!.hullDamage / e[e.kind]!.refireRate;
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
    shieldStats.shieldConstantPowerUsage + shieldStats.shieldRebuildPowerUsage;
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
}
