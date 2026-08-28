import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import authRoutes from "./modules/auth/routes";
import equipmentRoutes from "./modules/equipment/routes";

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Server is running" });
});

app.use("/auth", authRoutes);
app.use("/equipment", equipmentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
