import express from "express";
import { DataContext } from "fl-node-orm";

await DataContext.load(process.env.FL_ROOT as string);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/universe", async (req, res) => {
  const systems = DataContext.INSTANCE.entity("system").findAll();

  const result = systems
    .filter((s) => !s.visit.has("ALWAYS_HIDDEN"))
    .map((s) => ({
      nickname: s.nickname,
      name: s.name,
      infocard: s.infocard,
      position: s.position,
      visit: s.visit,
    }));
  res.json(result);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
