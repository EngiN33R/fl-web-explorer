import { ISearchResult } from "@api/types";
import sx from "../sidebar.module.css";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { IEquipment } from "fl-node-orm";

function EquipmentCard({ equipment }: { equipment: IEquipment }) {
  return (
    <div className={sx.itemCard}>
      <div>
        <span className={sx.name}>{equipment.name}</span>
        {equipment.gun && (
          <span className={sx.details}>
            {equipment.gun.hullDamage / equipment.gun.refireRate} hull DPS
          </span>
        )}
      </div>
    </div>
  );
}

export function ObjectTabs({ data }: { data: ISearchResult }) {
  const loadout = data?.type === "object" ? data.loadout : undefined;

  return (
    <TabGroup className={sx.tabs}>
      <TabList>
        <Tab>Info</Tab>
        {loadout && <Tab>Loadout</Tab>}
      </TabList>
      <TabPanels className={sx.dynamic}>
        <TabPanel>
          <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
        </TabPanel>
        {loadout && (
          <TabPanel>
            {loadout.equipment
              .filter((e) => e?.equipment)
              .map((e, idx) => (
                <EquipmentCard
                  key={`${idx}-${e.equipment.nickname}-${e.hardpoint}`}
                  equipment={e.equipment}
                />
              ))}
          </TabPanel>
        )}
      </TabPanels>
    </TabGroup>
  );
}
