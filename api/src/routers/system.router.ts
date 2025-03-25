import { Router } from "express";
import { DataContext } from "fl-node-orm";

const router = Router();

router.get("/", async (req, res) => {
  const systems = DataContext.INSTANCE.entity("system").findAll();

  const result = systems
    .filter((s) => s.nickname !== "fp7_system" && !!s.position)
    .map((s) => ({
      nickname: s.nickname,
      name: s.name,
      infocard: s.infocard,
      position: s.position,
      visit: s.visit,
      connections: Object.values(
        s.connections.reduce(
          (acc, c) => {
            if (c.system === s.nickname) {
              return acc;
            }

            if (acc[c.system] && acc[c.system].type !== c.type) {
              acc[c.system].type = "both";
            } else {
              acc[c.system] = {
                system: c.system,
                type: c.type,
              };
            }
            return acc;
          },
          {} as Record<
            string,
            { system: string; type: "jumpgate" | "jumphole" | "both" }
          >
        )
      ),
    }));
  res.json(result);
});

router.get("/:nickname", async (req, res) => {
  const { nickname } = req.params;
  const system = DataContext.INSTANCE.entity("system").findByNickname(nickname);
  if (!system) {
    res.status(404).send("Not found");
    return;
  }
  res.json(system);
});

export default router;
