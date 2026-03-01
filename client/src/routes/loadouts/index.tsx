import { IEquipment, IShip } from "fl-node-orm";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useReducer, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { groupBy } from "lodash";
import { Ids } from "@/components/ids";
import sx from "./loadouts.module.css";
import { asShareCode, decimal, percentage } from "@/util";
import { ILoadoutRes, ILoadoutStatsRes, IShipRes } from "@api/types";
import { calculateLoadoutStats } from "@api/util/loadout";
import { EquipmentDrawer } from "@/components/equipment/drawer";
import { useNotifications } from "@/data/context/notifications";
import { Description, Dialog, DialogPanel, Textarea } from "@headlessui/react";
import { IoCloseOutline } from "react-icons/io5";

export const Route = createFileRoute("/loadouts/")({
  component: LoadoutsView,
});

type LoadoutAction =
  | {
      type: "set_ship";
      ship: IShip | undefined;
      equipment?: ILoadoutRes["equipment"];
    }
  | {
      type: "set_equipment";
      hardpointId: string;
      equipment: IEquipment;
    }
  | {
      type: "clear_hardpoint";
      hardpointId: string;
    };

type LoadoutState = ILoadoutRes;
type LoadoutStats = ILoadoutStatsRes;

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
  const { showNotification } = useNotifications();
  const [isLoadOpen, setLoadOpen] = useState(false);
  const [shareCode, setShareCode] = useState("");

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
        case "clear_hardpoint": {
          const newState = { ...state, equipment: { ...state.equipment } };
          delete newState.equipment[action.hardpointId];
          return newState;
        }
      }
    },
    {
      ship: undefined,
      equipment: {},
    },
  );

  const share = async () => {
    const lean = {
      ship: loadout.ship?.nickname,
      equipment: Object.fromEntries(
        Object.entries(loadout.equipment ?? {}).map(([k, v]) => [
          k,
          v?.nickname,
        ]),
      ),
    };
    const code = await asShareCode(lean);
    await window.navigator.clipboard.writeText(code);
    showNotification({
      body: "Copied loadout share code to clipboard",
      timeout: 2000,
    });
  };

  const [hardpoint, setHardpoint] = useState<string | undefined>();
  const [selected, setSelected] = useState<IEquipment | undefined>();
  const [clearHardpoint, setClearHardpoint] = useState<string | undefined>();
  const equipmentTypes =
    loadout.ship?.hardpoints
      .filter((hp) => hp.id === hardpoint)
      .map((hp) => hp.type) ?? [];

  const { data: ships } = useQuery<IShipRes[]>({
    queryKey: ["ships"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/equip/ship`).then((r) => r.json()),
  });
  const { mutateAsync } = useMutation<ILoadoutRes, Error, string>({
    mutationFn: async (code: string) => {
      return fetch(`${import.meta.env.VITE_API_URL}/loadout/decode`, {
        method: "POST",
        headers: {
          ["Content-Type"]: "application/json",
        },
        body: JSON.stringify({ code }),
      }).then((r) => r.json());
    },
  });

  const currentStats = useMemo(() => {
    return loadout ? calculateLoadoutStats(loadout) : undefined;
  }, [loadout?.equipment]);
  const hoverStats = useMemo(() => {
    const stagedLoadout =
      (selected && hardpoint) || clearHardpoint
        ? {
            ...loadout,
            equipment: {
              ...loadout.equipment,
              ...(hardpoint && { [hardpoint]: selected }),
              ...(clearHardpoint && { [clearHardpoint]: null }),
            },
          }
        : undefined;
    return stagedLoadout ? calculateLoadoutStats(stagedLoadout) : undefined;
  }, [loadout?.equipment, selected, hardpoint, clearHardpoint]);
  const stats = hoverStats ?? currentStats;
  const mounted = hardpoint ? loadout.equipment[hardpoint] : undefined;
  const active = selected ?? mounted;

  return (
    <article className={sx.loadouts}>
      <section className={sx.player}>
        <div className={sx.loadout}>
          <select
            className={`${sx.ship} ${loadout.ship ? "" : sx.placeholder}`}
            value={loadout.ship?.nickname}
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
                    className={sx.equipment}
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
                  <button
                    className={`${sx.clear} danger`}
                    onClick={() => {
                      dispatchLoadout({
                        type: "clear_hardpoint",
                        hardpointId: id,
                      });
                    }}
                    onPointerEnter={() => {
                      setClearHardpoint(id);
                    }}
                    onPointerLeave={() => {
                      setClearHardpoint(undefined);
                    }}
                  >
                    <IoCloseOutline />
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
        <div className={sx.stats}>
          <ul>
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
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="shieldRegen"
              >
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
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="powerBalance"
              >
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
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="thrustSpeed"
              >
                {(value) => `${decimal(value)} m/s`}
              </Delta>
            </li>
            <li>
              <strong>Thruster Capacity: </strong>
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="thrustTotal"
              >
                {(value) => decimal(value)}
              </Delta>
            </li>
            <li>
              <strong>Thruster Charge Rate: </strong>
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="thrustRegen"
              >
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
              <Delta
                current={currentStats}
                next={hoverStats}
                prop="acceleration"
              >
                {(value) => `${decimal(value)} m/s²`}
              </Delta>
            </li>
          </ul>
          <div style={{ flex: 1 }} />
          <button className="button" onClick={() => setLoadOpen(true)}>
            Load
          </button>
          <button className="button" onClick={share}>
            Share
          </button>
        </div>
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
      <Dialog
        className={sx.loadModal}
        open={isLoadOpen}
        onClose={() => setLoadOpen(false)}
      >
        <div className={sx.loadModalBackdrop}>
          <DialogPanel className={sx.loadModalPanel}>
            <Description>Enter loadout share code</Description>
            <Textarea
              className={sx.input}
              value={shareCode}
              rows={8}
              placeholder="Base64-encoded LZ4-compressed JSON..."
              onChange={(e) => setShareCode(e.currentTarget.value)}
            />
            <div className={sx.footer}>
              <button
                onClick={() =>
                  mutateAsync(shareCode)
                    .then((v) =>
                      dispatchLoadout({
                        type: "set_ship",
                        ship: v.ship,
                        equipment: v.equipment,
                      }),
                    )
                    .then(() => {
                      showNotification({
                        body: "Loadout successfully loaded",
                        timeout: 2000,
                      });
                      setShareCode("");
                      setLoadOpen(false);
                    })
                }
              >
                Load
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShareCode("");
                  setLoadOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </article>
  );
}
