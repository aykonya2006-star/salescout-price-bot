import { app } from "./app";

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT должен быть целым числом от 1 до 65535.");
}

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`SaleScout API: http://127.0.0.1:${port}`);
});
server.on("error", (error: Error) => {
  console.error(`Не удалось запустить API: ${error.message}`);
  process.exitCode = 1;
});
