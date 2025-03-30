import { Router } from "express";
import { DataContext } from "fl-node-orm";

const equipment = DataContext.INSTANCE.entity("equipment");

const router = Router();

router.get("/search", async (req, res) => {
  const search = (req.query.q as string).toLowerCase();

  const exact = equipment.findByNickname(search);
  if (exact) {
    res.json([
      {
        ...exact,
        relevance: 1000,
      },
    ]);
    return;
  }

  const eligible = equipment.findAll();
  const relevance = eligible.map((e, idx) => [
    idx,
    [
      e.name.toLowerCase().replace("the", "").trim().startsWith(search) ? 3 : 0,
      e.name.toLowerCase().includes(search) ? 2 : 1,
      typeof e.nickname === "string" &&
      e.nickname?.toLowerCase().includes(search)
        ? 0.5
        : 0,
      e.infocard.toLowerCase().includes(search) ? 0.5 : 0,
    ]
      .map(Number)
      .reduce((a, b) => a + b, 0),
  ]);

  res.json(
    relevance
      .filter((r) => r[1])
      .sort((a, b) => b[1] - a[1])
      .map((r) => {
        const body = eligible[r[0]];
        return {
          ...body,
          relevance: r[1],
        };
      })
      .slice(0, 50)
  );
});

export default router;
