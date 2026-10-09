import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import { User, Task } from "./models.js";

const credentials = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(8)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v, "utf8") <= 72,
        "Password must be at most 72 bytes"
      ),
  })
  .strict();
const taskInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    scheduledAt: z.string().datetime({ offset: true }),
    deadline: z.string().datetime({ offset: true }),
    priority: z.enum(["low", "medium", "high"]),
    category: z.string().trim().max(40).default(""),
  })
  .strict()
  .refine((v) => Date.parse(v.deadline) >= Date.parse(v.scheduledAt), {
    message: "Deadline must be after the scheduled time",
    path: ["deadline"],
  });

export function createApp(secret: string) {
  if (secret.length < 32 || secret.startsWith("replace-"))
    throw new Error("Set a random JWT_SECRET of at least 32 characters");
  const app = express();
  app.use(helmet(), cors({ origin: false }), express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(
    "/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many attempts. Try again in 15 minutes." },
    })
  );
  const session = (id: string, email: string) => ({
    token: jwt.sign({}, secret, {
      subject: id,
      expiresIn: "7d",
      issuer: "plain-tasks",
      audience: "plain-tasks-mobile",
    }),
    user: { id, email },
  });
  app.post("/auth/register", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    res.status(201).json(session(user.id, email));
  });
  app.post("/auth/login", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ message: "Incorrect email or password" });
      return;
    }
    res.json(session(user.id, user.email));
  });
  app.use("/tasks", (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) throw new Error();
      const payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "plain-tasks",
        audience: "plain-tasks-mobile",
      });
      if (
        typeof payload === "string" ||
        !payload.sub ||
        !mongoose.isValidObjectId(payload.sub)
      )
        throw new Error();
      res.locals.owner = payload.sub;
      next();
    } catch {
      res.status(401).json({ message: "Please sign in again" });
    }
  });
  // Every query includes the authenticated owner, including updates and deletes.
  app.get("/tasks", async (_req, res) => {
    res.json(
      await Task.find({ owner: res.locals.owner }).sort({ deadline: 1 }).lean()
    );
  });
  app.post("/tasks", async (req, res) => {
    res
      .status(201)
      .json(
        await Task.create({
          ...taskInput.parse(req.body),
          owner: res.locals.owner,
        })
      );
  });
  app.param("id", (_req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid task ID" });
      return;
    }
    next();
  });
  app.patch("/tasks/:id", async (req, res) => {
    const update = z
      .object({ completed: z.boolean() })
      .strict()
      .parse(req.body);
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: res.locals.owner },
      update,
      { new: true, runValidators: true }
    );
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.json(task);
  });
  app.delete("/tasks/:id", async (req, res) => {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      owner: res.locals.owner,
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.status(204).end();
  });
  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
      return;
    }
    if (error.code === 11000) {
      res
        .status(409)
        .json({ message: "An account with this email already exists" });
      return;
    }
    if (error.type === "entity.parse.failed") {
      res.status(400).json({ message: "Invalid JSON" });
      return;
    }
    if (error.type === "entity.too.large") {
      res.status(413).json({ message: "Request too large" });
      return;
    }
    console.error(error.name, error.message);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  });
  return app;
}
