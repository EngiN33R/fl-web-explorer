import { ILoadoutStatsRes, ISearchResult } from "@api/types";
import sx from "../sidebar.module.css";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { groupBy } from "lodash";
import { useQuery } from "@tanstack/react-query";
import { decimal } from "@/util";

export function CombatTab({ data }: { data: ISearchResult }) {
  const loadout = "loadout" in data ? data.loadout : undefined;
  const { data: stats } = useQuery<ILoadoutStatsRes>({
    queryKey: [
      "loadout",
      JSON.stringify({
        equipment: Object.fromEntries(
          loadout?.equipment?.map(({ equipment, hardpoint }) => [
            hardpoint,
            equipment,
          ]) ?? [],
        ),
      }),
    ],
    queryFn: async ({ queryKey }) => {
      const result = await fetch(
        `${import.meta.env.VITE_API_URL}/loadout/stats`,
        {
          method: "POST",
          headers: {
            ["Content-Type"]: "application/json",
          },
          body: queryKey[1] as string,
        },
      );
      return result.json();
    },
  });

  return (
    <TabPanel>
      <div className="md-title">Equipment</div>
      {Object.values(
        groupBy(
          loadout?.equipment.filter((e) => e?.equipment) ?? [],
          (e) => e.equipment.nickname,
        ),
      ).map((list, idx) => {
        const e = list[0];
        return (
          <div key={`${idx}-${e.equipment.nickname}-${e.hardpoint}`}>
            {list.length}x {e.equipment.name}
          </div>
        );
      })}
      <div className="md-title" style={{ marginTop: 8 }}>
        Stats
      </div>
      <div>Hull DPS: {decimal(stats?.damagePerSecondHull ?? 0)}</div>
      <div>Shield DPS: {decimal(stats?.damagePerSecondShield ?? 0)}</div>
    </TabPanel>
  );
}

export function ObjectTabs({ data }: { data: ISearchResult }) {
  const loadout = data?.type === "object" ? data.loadout : undefined;

  return (
    <TabGroup className={sx.tabs}>
      <TabList>
        <Tab>Info</Tab>
        {loadout && <Tab>Combat</Tab>}
      </TabList>
      <TabPanels className={sx.dynamic}>
        <TabPanel>
          <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
        </TabPanel>
        {loadout && <CombatTab data={data} />}
      </TabPanels>
    </TabGroup>
  );
}
