import express from "express";
import postRoutes from "./routes/postRoutes.js";
import cors from "cors";
const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", postRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
