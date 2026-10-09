import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);
export const User = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true },
    deadline: { type: Date, required: true },
    priority: { type: String, enum: ["low", "medium", "high"], required: true },
    category: { type: String, default: "" },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
taskSchema.index({ owner: 1, deadline: 1 });
export const Task = mongoose.model("Task", taskSchema);
