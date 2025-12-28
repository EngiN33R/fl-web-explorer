import { IBaseRes, IMarketOfferRes, ISearchResult } from "@api/types";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import sx from "../sidebar.module.css";
import { useQuery } from "@tanstack/react-query";
import { GiTargetShot } from "react-icons/gi";
import { IoMap, IoPerson } from "react-icons/io5";
import { transform } from "lodash";
import { IFaction } from "fl-node-orm";
import { credits } from "@/util";

type IRumor = {
  rumor: string;
  faction: IFaction;
  objects: ISearchResult["npcs"][number]["rumors"][number]["objects"];
  npcs: ISearchResult["npcs"][number][];
};

const missionDifficulties: Record<number, string> = {
  "0": "Trivial",
  "0.5": "Very Easy",
  "1.5": "Easy",
  "8": "Medium",
  "15": "Hard",
  "50": "Very Hard",
  "100": "Special",
};

function MarketCard({ offer }: { offer: IMarketOfferRes }) {
  const isCommodity =
    offer.equipment.type === "equipment" &&
    offer.equipment.kind === "commodity";
  const priceDifference = (offer.price / offer.basePrice - 1) * 100;
  const positive =
    (priceDifference < 0 && offer.sold) || (priceDifference > 0 && !offer.sold);

  return (
    <div
      className={sx.itemCard}
      title={
        isCommodity
          ? offer.sold
            ? "Sold at this base"
            : "Bought at non-default price"
          : ""
      }
    >
      <img
        className={sx.icon}
        src={`${import.meta.env.VITE_API_URL}/assets/icon/market/${
          offer.equipment.nickname
        }`}
        alt=""
      />
      <div>
        <span className={sx.name}>
          {offer.equipment.name} {isCommodity && offer.sold ? "$" : ""}
        </span>
        <div className={sx.details}>
          <span className={sx.price}>
            {credits(offer.price)}
            {isCommodity && (
              <span
                className={`${sx.indicator} ${
                  priceDifference < 0
                    ? sx.down
                    : priceDifference > 0
                      ? sx.up
                      : sx.average
                } ${
                  priceDifference === 0
                    ? ""
                    : positive
                      ? sx.positive
                      : sx.negative
                }`}
              >
                {priceDifference.toFixed(0)}%
              </span>
            )}
          </span>
          {offer.rep !== -1 && (
            <span className={sx.rep}>{offer.rep.toFixed(2)} rep</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({
  mission,
}: {
  mission: ISearchResult["missions"][number] & {
    npcs?: ISearchResult["npcs"][number][];
  };
}) {
  const minText = `${
    missionDifficulties[mission.difficulty[0]]
  } (${credits(mission.reward[0])})`;
  const maxText = `${
    missionDifficulties[mission.difficulty[1]]
  } (${credits(mission.reward[1])})`;

  return (
    <div className={sx.itemCard}>
      <div className={sx.icon}>
        <GiTargetShot size={48} />
      </div>
      <div>
        <span className={sx.name}>
          {mission.faction.name}{" "}
          {mission.npcs && (
            <IoPerson
              size={16}
              style={{ marginLeft: 4, marginTop: 3 }}
              title={`Offered by ${mission.npcs.map((n) => n.name).join(", ")}`}
            />
          )}
        </span>
        <span className={sx.details}>
          <span>
            {minText} - {maxText}
          </span>
        </span>
      </div>
    </div>
  );
}

type IKnowledge = ISearchResult["npcs"][number]["knowledge"][number] & {
  npc: ISearchResult["npcs"][number];
};

function KnowledgeCard({ knowledge }: { knowledge: IKnowledge }) {
  return (
    <div className={sx.itemCard}>
      <div className={sx.icon}>
        <IoMap size={48} />
      </div>
      <div>
        <span className={sx.name}>
          {knowledge.object?.name}
          <IoPerson
            size={16}
            style={{ marginLeft: 4, marginTop: 3 }}
            title={`Sold by ${knowledge.npc.name}`}
          />
        </span>
        <span className={sx.details}>
          <span>{credits(knowledge.price)}</span>
          <span>REP {knowledge.reputation.toFixed(2)}+</span>
        </span>
      </div>
    </div>
  );
}
function RumorCard({ rumor }: { rumor: IRumor }) {
  return (
    <div className={sx.detailedCard}>
      <span className={sx.name}>
        {rumor.faction.name}
        <IoPerson
          size={16}
          style={{ marginLeft: 4, marginTop: 3 }}
          title={`${rumor.npcs.map((n) => n.name).join(", ")}`}
        />
      </span>
      <blockquote
        className={sx.details}
        dangerouslySetInnerHTML={{
          __html: rumor.rumor.replace(/<br\s*\/?>$/, ""),
        }}
      />
      {!!rumor.objects.length && (
        <div className={sx.addon}>
          <div className={sx.tagList}>
            <span style={{ fontSize: "90%", marginRight: 4 }}>Discovers:</span>
            {rumor.objects.map((t) => (
              <div className={sx.tag}>{t.name}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BaseTabs({ data }: { data: IBaseRes & ISearchResult }) {
  const { data: offers } = useQuery<IMarketOfferRes[]>({
    queryKey: ["base-goods", data.nickname],
    queryFn: () =>
      fetch(
        `${import.meta.env.VITE_API_URL}/economy/offers/${data.nickname}`
      ).then((res) => res.json()),
  });

  const commodities = offers?.filter(
    (o) => o.equipment.type === "equipment" && o.equipment.kind === "commodity"
  );
  const ships = offers?.filter((o) => o.equipment.type === "ship");
  const equipment = offers?.filter(
    (o) => o.equipment.type === "equipment" && o.equipment.kind !== "commodity"
  );

  const knowledge = data.npcs?.flatMap((npc) =>
    npc.knowledge.map((k) => ({ ...k, npc }))
  );
  const rumors = data.npcs?.flatMap((npc) =>
    npc.rumors.map((r) => ({ ...r, npc }))
  );

  const uniqueNpcMissions = transform(
    data.npcs?.flatMap((npc) => npc.missions.map((m) => ({ ...m, npc }))),
    (acc, m) => {
      const key = `${m.faction.nickname}-${m.difficulty}-${m.reward}`;
      if (!acc[key]) acc[key] = { ...m, npcs: [] };
      acc[key].npcs.push(m.npc);
      return acc;
    },
    {} as Record<
      string,
      ISearchResult["missions"][number] & {
        npcs: ISearchResult["npcs"][number][];
      }
    >
  );
  const uniqueRumors = transform(
    rumors,
    (acc, r) => {
      if (acc[r.rumor]) {
        acc[r.rumor].npcs.push(r.npc);
      } else {
        acc[r.rumor] = {
          rumor: r.rumor,
          faction: r.npc.faction,
          objects: r.objects,
          npcs: [r.npc],
        };
      }
      return acc;
    },
    {} as Record<string, IRumor>
  );
  return (
    <>
      <TabGroup className={sx.tabs}>
        <TabList>
          <Tab>Info</Tab>
          <Tab>Bar</Tab>
          {!!commodities?.length && <Tab>Commodities</Tab>}
          {!!equipment?.length && <Tab>Equipment</Tab>}
          {!!ships?.length && <Tab>Ships</Tab>}
        </TabList>
        <TabPanels className={sx.dynamic}>
          <TabPanel>
            <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
          </TabPanel>
          <TabPanel>
            {!!data.missions?.length && (
              <>
                <h3>Missions</h3>
                {data.missions.map((m, idx) => (
                  <MissionCard
                    key={`${m.faction.nickname}-${m.difficulty}-${m.reward}-${idx}`}
                    mission={m}
                  />
                ))}
                {Object.entries(uniqueNpcMissions)?.map(([key, m]) => (
                  <MissionCard
                    key={`${m.npcs.map((n) => n.nickname).join(", ")}-${key}`}
                    mission={m}
                  />
                ))}
                <div style={{ height: 8 }} />
              </>
            )}
            {!!knowledge?.length && (
              <>
                <h3>Knowledge</h3>
                {knowledge.map((k) => (
                  <KnowledgeCard key={k.text} knowledge={k} />
                ))}
                <div style={{ height: 8 }} />
              </>
            )}
            {!!Object.values(uniqueRumors)?.length && (
              <>
                <h3>Rumors</h3>
                {Object.values(uniqueRumors).map((r) => (
                  <RumorCard key={r.rumor} rumor={r} />
                ))}
              </>
            )}
          </TabPanel>
          {!!commodities?.length && (
            <TabPanel>
              {commodities?.map((o) => (
                <MarketCard key={o.equipment.nickname} offer={o} />
              ))}
            </TabPanel>
          )}
          {!!equipment?.length && (
            <TabPanel>
              {equipment?.map((o) => (
                <MarketCard key={o.equipment.nickname} offer={o} />
              ))}
            </TabPanel>
          )}
          {!!ships?.length && (
            <TabPanel>
              {ships?.map((o) => (
                <MarketCard key={o.equipment.nickname} offer={o} />
              ))}
            </TabPanel>
          )}
        </TabPanels>
      </TabGroup>
    </>
  );
}
