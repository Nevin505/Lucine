import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import authRoutes from "./modules/auth/routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Server is running" });
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
