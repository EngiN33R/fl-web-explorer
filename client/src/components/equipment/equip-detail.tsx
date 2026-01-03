import { useQuery } from "@tanstack/react-query";
import { IEquipment, ProcurementDetails } from "fl-node-orm";
import sx from "./equipment.module.css";
import { credits, percentage } from "@/util";
import { Ids } from "../ids";
import { Link } from "@tanstack/react-router";
import { INpcRes } from "@api/types";

function NpcLoadout({ nickname }: { nickname: string }) {
  const { data: npc } = useQuery<INpcRes>({
    queryKey: ["npc", nickname],
    queryFn: async () => {
      const result = await fetch(
        `${import.meta.env.VITE_API_URL}/npc/${nickname}`
      );
      return result.json();
    },
  });
  return (
    <span>
      {npc?.faction?.name} - LVL {npc?.level} {npc?.ship?.name}
    </span>
  );
}

function Obtainable({ details }: { details: ProcurementDetails }) {
  switch (details.type) {
    case "market":
      return (
        <li>
          Sold at{" "}
          <Link
            to="/navmap/$system"
            params={{ system: details.system }}
            search={{ nickname: details.base }}
          >
            <Ids>{details.base}</Ids>
          </Link>{" "}
          in <Ids>{details.system}</Ids> ({credits(details.price)}
          {details.rep != null && details.rep > -1 ? (
            <>&nbsp;@&nbsp;&ge;{details.rep.toFixed(2)}&nbsp;rep</>
          ) : (
            ""
          )}
          )
        </li>
      );
    case "ship_package":
      return (
        <li>
          Packaged with <Ids>{details.ship}</Ids>
        </li>
      );
    case "npc_loot":
      return (
        <li>
          Drops from <NpcLoadout nickname={details.loadout} /> (
          {percentage(details.chance)}&nbsp;chance)
        </li>
      );
    case "phantom_loot":
      return <li>Drops from any NPC ({percentage(details.chance)} chance)</li>;
    case "wreck_loot":
      return (
        <li>
          Lootable from{" "}
          <Link
            to="/navmap/$system"
            params={{ system: details.system }}
            search={{ nickname: details.object }}
          >
            <Ids>{details.object}</Ids>
          </Link>{" "}
          in <Ids>{details.system}</Ids>
        </li>
      );
    case "crafting":
      return (
        <li>
          Craftable
          {details.recipe.bases.length ? (
            <>
              {" "}
              on{" "}
              {details.recipe.bases.map((b, idx) => (
                <>
                  <Link
                    to="/navmap/$system"
                    params={{ system: b }}
                    search={{ nickname: b }}
                  >
                    <Ids>{b}</Ids>
                  </Link>
                  {idx < details.recipe.bases.length - 1 ? ", " : ""}
                </>
              ))}
            </>
          ) : (
            " everywhere"
          )}{" "}
          from{" "}
          {details.recipe.ingredients.map((i, idx) => (
            <>
              {i.amount}x&nbsp;<Ids>{i.good}</Ids>
              {idx < details.recipe.ingredients.length - 1 ? ", " : ""}
            </>
          ))}
          {details.recipe.cost ? ", " + credits(details.recipe.cost) : ""}
        </li>
      );
    case "lootbox":
      return (
        <li>
          Lootable from {details.box} with a {percentage(details.chance)} chance
        </li>
      );
    case "mining":
      return <li>Mined from zones</li>;
    default:
      return <li>Unknown</li>;
  }
}

export function EquipmentDetail({
  nickname,
  className,
}: {
  nickname: string;
  className?: string;
}) {
  const { data: equipment } = useQuery<
    IEquipment & { obtainable: ProcurementDetails[] }
  >({
    queryKey: ["equipment", nickname],
    queryFn: async () => {
      const result = await fetch(
        `${import.meta.env.VITE_API_URL}/equip/${nickname}`
      );
      return result.json();
    },
  });

  return (
    <div className={`${sx.detail} ${className ?? ""}`}>
      <div className={sx.name}>{equipment?.name}</div>
      <div
        className={sx.description}
        dangerouslySetInnerHTML={{
          __html: equipment?.infocard ?? "",
        }}
      />
      <div className={sx.obtainable}>
        <h3>Obtainable</h3>
        <ul>
          {equipment?.obtainable.map((o) => (
            <Obtainable details={o} key={JSON.stringify(o)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
