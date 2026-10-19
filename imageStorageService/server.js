const express = require("express");
const uploadRoutes = require("./route/upload");
const imageRoutes = require("./route/images");
const deleteRoutes = require("./route/delete");
const copyRoutes = require("./route/copy"); 
const videoRoutes = require("./route/video");
const s3 = require("./services/s3Client");

const app = express();

app.use("/upload", uploadRoutes);
app.use("/image", imageRoutes);
app.use("/delete", deleteRoutes);
app.use("/copy", copyRoutes); 
app.use("/video", videoRoutes);

// Disponibilidade do armazenamento (REQ-VID-COM-009)
app.get("/health", async (req, res) => {
  try {
    await s3.listBuckets().promise();
    res.status(200).json({ status: "ok" });
  } catch (error) {
    res.status(503).json({ status: "unavailable", error: error.message });
  }
});

const PORT = process.env.PORT || 11000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
