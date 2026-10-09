import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";

const app = createApp(process.env.JWT_SECRET ?? "");
await mongoose.connect(
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/plain_tasks"
);
const server = app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () =>
  console.log("Plain Tasks API is ready")
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
  );
