import Fastify from "fastify";

const app = Fastify();

app.get("/healthz", async () => ({ ok: true }));

const port = process.env.PORT || 4000;
app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`backend :${port}`);
});
