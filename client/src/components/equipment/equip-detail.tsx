import { useQuery } from "@tanstack/react-query";
import { IEquipment, ProcurementDetails } from "fl-node-orm";
import sx from "./equipment.module.css";
import { credits, percentage } from "@/util";

function Obtainable({ details }: { details: ProcurementDetails }) {
  switch (details.type) {
    case "market":
      return (
        <li>
          Sold at {details.base} in {details.system} ({credits(details.price)})
        </li>
      );
    case "npc_loot":
      return (
        <li>
          Lootable from {details.loadout} ships of {details.faction}
        </li>
      );
    case "wreck_loot":
      return (
        <li>
          Lootable from {details.object} in {details.system}
        </li>
      );
    case "crafting":
      return (
        <li>
          Craftable
          {details.recipe.bases.length
            ? ` on ${details.recipe.bases.join(", ")}`
            : " everywhere"}{" "}
          from{" "}
          {details.recipe.ingredients
            .map((i) => `${i.amount}x ${i.good}`)
            .concat(
              details.recipe.cost ? [`${credits(details.recipe.cost)}`] : []
            )
            .join(", ")}{" "}
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
