import { IBaseRes, IMarketOfferRes } from "@api/types";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import sx from "../sidebar.module.css";
import { useQuery } from "@tanstack/react-query";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",
  maximumFractionDigits: 0,
});

function MarketCard({ offer }: { offer: IMarketOfferRes }) {
  const isCommodity =
    offer.equipment.type === "equipment" &&
    offer.equipment.kind === "commodity";
  const priceDifference = (offer.price / offer.basePrice - 1) * 100;
  const positive =
    (priceDifference < 0 && offer.sold) || (priceDifference > 0 && !offer.sold);

  return (
    <div
      className={sx.marketCard}
      title={
        isCommodity
          ? offer.sold
            ? "Sold at this base"
            : "Bought at non-default price"
          : ""
      }
    >
      <img
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
            {moneyFormatter.format(offer.price)}
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

export function BaseTabs({ data }: { data: IBaseRes }) {
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
            <p>Bar</p>
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
