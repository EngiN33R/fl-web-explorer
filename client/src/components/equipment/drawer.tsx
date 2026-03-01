import { useMemo, useState } from "react";
import { IEquipment } from "fl-node-orm";
import { useQuery } from "@tanstack/react-query";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { EquipmentDetail } from "./equip-detail";
import sx from "./equipment.module.css";
import { IEquipmentRes } from "@api/types";
import { decimal } from "@/util";
import { uniq } from "lodash";
import { useSort } from "@/data/sort";
import { SortIcon } from "../sort-icon";

type Column =
  | "name"
  | "avgDpp"
  | "avgDps"
  | "capacity"
  | "regen"
  | "speed"
  | "cruiseSpeed"
  | "powerUsage";

type EquipmentWithStats = IEquipmentRes & {
  avgDpp?: number;
  avgDps?: number;
  capacity?: number;
  regen?: number;
  speed?: number;
  cruiseSpeed?: number;
  powerUsage?: number;
};

type ColDef = {
  key: Column;
  label: string;
  fr: number;
  formatter: (value: number | string) => string;
};

const decimalFormatter = (value: number | string) => decimal(Number(value));

export function EquipmentDrawer({
  className,
  onClose,
  onSelect,
  onConfirm,
  value: selected,
  acceptDisabled,
  types,
}: {
  className?: string;
  onClose: () => void;
  onSelect?: (equipment: IEquipment) => void;
  onConfirm: (equipment: IEquipment) => void;
  value?: IEquipment | null;
  acceptDisabled?: boolean;
  types?: string[];
}) {
  const [search, setSearch] = useState("");
  const [procurable, setProcurable] = useState<string[]>([]);
  const [sortColumn, sortDirection, setSort] = useSort<Column>(["name", 1]);

  const { data: equipment } = useQuery<EquipmentWithStats[]>({
    queryKey: ["equipment", types ? JSON.stringify(types) : undefined],
    queryFn: async ({ queryKey }) => {
      const hardpoints = queryKey[1]
        ? (JSON.parse(queryKey[1] as string) as string[])
        : undefined;
      const url = new URL(`${import.meta.env.VITE_API_URL}/equip/search`);
      hardpoints?.forEach((type) =>
        url.searchParams.append("hardpoint[]", type),
      );
      procurable
        ?.flatMap((source) => source.split(","))
        .forEach((source) => url.searchParams.append("sources[]", source));
      url.searchParams.append("obtainable", "true");
      url.searchParams.append("limit", "0");
      const result = await fetch(url.toString());
      const data = (await result.json()) as IEquipmentRes[];
      const kinds = uniq(data?.map((e) => e.kind)).sort();
      const map = {
        isEnergyWeapon: kinds.includes("gun") || kinds.includes("turret"),
        isAmmoWeapon: kinds.includes("missile") || kinds.includes("mine"),
        isShield: kinds.includes("shield"),
        isPower: kinds.includes("power"),
        isEngine: kinds.includes("engine"),
        isThruster: kinds.includes("thruster"),
      };

      return data.map((e) => {
        const dmgProps =
          map?.isAmmoWeapon || map?.isEnergyWeapon
            ? e[e.kind as "gun" | "turret" | "missile" | "mine"]
            : undefined;
        const avgDps = dmgProps
          ? (dmgProps.hullDamage + dmgProps.shieldDamage) / 2
          : undefined;
        return {
          ...e,
          avgDpp:
            e.gun && avgDps != null ? avgDps / e.gun.powerUsage : undefined,
          avgDps,
          capacity: map.isShield
            ? e.shield?.capacity
            : map.isPower
              ? e.power?.capacity
              : undefined,
          regen: map.isShield
            ? e.shield?.regeneration
            : map.isPower
              ? e.power?.chargeRate
              : undefined,
          speed: map.isEngine
            ? e.engine?.speed
            : map.isThruster
              ? e.thruster?.speed
              : undefined,
          cruiseSpeed: map.isEngine ? e.engine?.cruiseSpeed : undefined,
          powerUsage: map.isThruster ? e.thruster?.powerUsage : undefined,
        };
      });
    },
  });
  const sorted = useMemo(() => {
    return sortColumn
      ? equipment?.sort((a, b) => {
          return (
            sortDirection *
            (typeof a[sortColumn] === "string"
              ? (a[sortColumn] ?? "").localeCompare(
                  (b[sortColumn] as string) ?? "",
                )
              : ((a[sortColumn] as number) ?? 0) -
                ((b[sortColumn] as number) ?? 0))
          );
        })
      : equipment;
  }, [equipment, sortColumn, sortDirection]);

  const kinds = uniq(equipment?.map((e) => e.kind)).sort();
  const optionsMap = useMemo(() => {
    const map = {
      isEnergyWeapon: kinds.includes("gun") || kinds.includes("turret"),
      isAmmoWeapon: kinds.includes("missile") || kinds.includes("mine"),
      isShield: kinds.includes("shield"),
      isPower: kinds.includes("power"),
      isEngine: kinds.includes("engine"),
      isThruster: kinds.includes("thruster"),
    };
    if (
      Object.values(map).filter((v) => v).length > 1 &&
      (!map.isEnergyWeapon || !map.isAmmoWeapon)
    ) {
      return undefined;
    }
    return map;
  }, [JSON.stringify(kinds)]);

  const gridDef = useMemo(() => {
    const defs: ColDef[] = [
      {
        key: "name",
        label: "Name",
        fr: 3,
        formatter: (value) => value as string,
      },
    ];

    if (optionsMap?.isEnergyWeapon) {
      defs.push({
        key: "avgDpp",
        label: "Avg DPP",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isAmmoWeapon || optionsMap?.isEnergyWeapon) {
      defs.push({
        key: "avgDps",
        label: "Avg DPS",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isShield || optionsMap?.isPower) {
      defs.push({
        key: "capacity",
        label: "Capacity",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isShield || optionsMap?.isPower) {
      defs.push({
        key: "regen",
        label: "Regen",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isEngine || optionsMap?.isThruster) {
      defs.push({
        key: "speed",
        label: "Speed",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isEngine) {
      defs.push({
        key: "cruiseSpeed",
        label: "Cruise Speed",
        fr: 1,
        formatter: decimalFormatter,
      });
    }
    if (optionsMap?.isThruster) {
      defs.push({
        key: "powerUsage",
        label: "Power Usage",
        fr: 1,
        formatter: decimalFormatter,
      });
    }

    return {
      defs,
      templateColumns: defs.map((d) => `${d.fr}fr`).join(" "),
    };
  }, [optionsMap]);

  return (
    <aside className={`${sx.drawer} ${className}`}>
      <div className={sx.actions}>
        <button
          className={`${sx.action} ${sx.accept} ${!selected || acceptDisabled ? sx.disabled : ""}`}
          onClick={() => {
            if (selected) {
              onConfirm(selected);
            }
          }}
        />
        <button
          className={`${sx.action} ${sx.close}`}
          onClick={() => {
            onClose();
            setSearch("");
          }}
        />
      </div>
      {selected ? (
        <EquipmentDetail className={sx.detail} nickname={selected.nickname} />
      ) : (
        <div className={sx.detail}>
          <div className={sx.center}>Please select equipment first</div>
        </div>
      )}
      <div className={sx.search}>
        <div className={sx.toolbar}>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Listbox value={procurable} onChange={setProcurable} multiple>
            <ListboxButton className={`multiselect ${sx.multiselect}`}>
              {procurable?.length
                ? `${procurable.length} sources`
                : "Obtainable from..."}
            </ListboxButton>
            <ListboxOptions anchor="bottom" className="options multiselect">
              <ListboxOption className="option" value="market">
                Purchasable
              </ListboxOption>
              <ListboxOption className="option" value="crafting">
                Craftable
              </ListboxOption>
              <ListboxOption className="option" value="npc_loot,phantom_loot">
                NPC Loot
              </ListboxOption>
              <ListboxOption className="option" value="wreck_loot">
                Wreck Loot
              </ListboxOption>
              <ListboxOption className="option" value="lootbox">
                Lootbox
              </ListboxOption>
            </ListboxOptions>
          </Listbox>
        </div>
        <div
          className={sx.heading}
          style={{ gridTemplateColumns: gridDef.templateColumns }}
        >
          {gridDef.defs.map((d, idx) => (
            <button
              key={d.key}
              className={sx.cell}
              role="columnheader"
              onClick={() => setSort(d.key)}
              style={{ gridColumn: idx + 1 }}
            >
              {d.label}
              <SortIcon column={d.key} sort={[sortColumn, sortDirection]} />
            </button>
          ))}
        </div>
        <ul className={sx.list}>
          {sorted?.map((e) => {
            return (
              <li key={e.nickname}>
                <button
                  className={`${sx.row} ${selected?.nickname === e.nickname ? sx.active : ""}`}
                  style={{ gridTemplateColumns: gridDef.templateColumns }}
                  onClick={() => {
                    onSelect?.(e);
                  }}
                >
                  {gridDef.defs.map((d, idx) => (
                    <div className={sx.cell} style={{ gridColumn: idx + 1 }}>
                      {d.key === "name" ? (
                        <>
                          <div className={sx.title}>{e.name}</div>
                          <div className={sx.caption}>{e.nickname}</div>
                        </>
                      ) : e[d.key] ? (
                        d.formatter ? (
                          d.formatter(e[d.key] as string | number)
                        ) : (
                          e[d.key]
                        )
                      ) : (
                        "-"
                      )}
                    </div>
                  ))}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={sx.footer}>
        <button
          className={!selected || acceptDisabled ? "disabled" : ""}
          onClick={() => {
            if (selected) {
              onConfirm(selected);
            }
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => {
            onClose();
            setSearch("");
          }}
        >
          Close
        </button>
      </div>
    </aside>
  );
}
