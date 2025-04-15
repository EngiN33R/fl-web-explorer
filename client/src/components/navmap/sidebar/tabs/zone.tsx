import { IZoneRes } from "@api/types";
import sx from "../sidebar.module.css";

function EquipmentCard({ loot }: { loot: NonNullable<IZoneRes["loot"]> }) {
  const difficultyClass =
    loot.difficulty > 10
      ? `${sx.negative} ${sx.up}`
      : loot.difficulty < 5
      ? `${sx.positive} ${sx.down}`
      : `${sx.average} ${sx.side}`;

  return (
    <div className={sx.marketCard}>
      <img
        src={`${import.meta.env.VITE_API_URL}/assets/icon/market/${
          loot.equipment.nickname
        }`}
        alt=""
      />
      <div>
        <span className={sx.name}>
          {loot.count[0]}-{loot.count[1]}x {loot.equipment.name}
        </span>
        <span className={sx.price}>
          Difficulty:&nbsp;
          <span className={difficultyClass}>{loot.difficulty}</span>
        </span>
      </div>
    </div>
  );
}

export function ZoneTabs({ data }: { data: IZoneRes }) {
  const isGas = data.properties?.includes("GAS_POCKETS");
  const isMine = data.properties?.includes("MINES");
  const isMedDanger = data.properties?.includes("DANGER_MEDIUM");
  const isHighDanger = data.properties?.includes("DANGER_HIGH");

  return (
    <>
      {data?.damage && (
        <div
          className={`${sx.banner} ${
            data?.damage > 20 ? sx.critical : sx.warning
          }`}
        >
          This area deals {data?.damage} damage
        </div>
      )}
      {isGas && (
        <div
          className={`${sx.banner} ${isHighDanger ? sx.critical : sx.warning}`}
        >
          This area deals {isHighDanger ? "high damage" : "damage"} from
          exploding gas pockets
        </div>
      )}
      {isMine && (
        <div
          className={`${sx.banner} ${isHighDanger ? sx.critical : sx.warning}`}
        >
          This area deals {isHighDanger ? "high damage" : "damage"} from mines
        </div>
      )}
      {!isGas && !isMine && (isMedDanger || isHighDanger) && (
        <div
          className={`${sx.banner} ${isHighDanger ? sx.critical : sx.warning}`}
        >
          This area is marked as{" "}
          {isHighDanger ? "highly dangerous" : "dangerous"}
        </div>
      )}
      <div className={sx.dynamic}>
        <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
        {data.loot && (
          <>
            <h3>Loot</h3>
            <EquipmentCard loot={data.loot} />
          </>
        )}
      </div>
    </>
  );
}
