import { IObjectRes } from "@api/types";
import sx from "../sidebar.module.css";
import { IEquipment } from "fl-node-orm";

function EquipmentCard({
  equipment,
  count,
}: {
  equipment: IEquipment;
  count: number;
}) {
  return (
    <div className={sx.itemCard}>
      <img
        className={sx.icon}
        src={`${import.meta.env.VITE_API_URL}/assets/icon/market/${
          equipment.nickname
        }`}
        alt=""
      />
      <div>
        <span className={sx.name}>
          {count}x {equipment.name}
        </span>
      </div>
    </div>
  );
}

export function LootableTabs({ data }: { data: IObjectRes }) {
  return (
    <div className={sx.dynamic}>
      <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
      <h3>Loot</h3>
      {data.loadout?.cargo.map((e, idx) => (
        <EquipmentCard
          key={`${idx}-${e.equipment.nickname}-${e.count}`}
          equipment={e.equipment}
          count={e.count}
        />
      ))}
    </div>
  );
}
