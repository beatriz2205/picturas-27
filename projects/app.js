var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongoose = require("mongoose");

const { router: projectsRouter, process_msg } = require("./routes/projects");
const { router: videosRouter } = require("./routes/videos");
const { retryQueuedTasks } = require("./video/taskService");

// Run Docker
const mongoDB = "mongodb://projects_mongoDB:27018/project";

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on("error", console.error.bind(console, "Error connecting to Mongodb"));
db.once("open", () => {
  console.log("Mongodb connection successful");
  // Coleções de vídeo: alinhar os índices com os modelos. O Mongoose cria índices em falta mas não
  // substitui um índice com o mesmo nome e opções diferentes (por exemplo, o índice de upload_id que
  // passou de sparse a parcial), o que dava "duplicate key" no segundo resultado de um projeto.
  for (const model of [require("./models/videoAsset"), require("./models/videoTask")]) {
    model.syncIndexes().catch((e) => console.error("[video] syncIndexes", model.modelName, e.message));
  }
});

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Rotas de vídeo antes das de projeto: "/:user/video-limits" coincidiria com "/:user/:project"
app.use("/", videosRouter);
app.use("/", projectsRouter);

// Start the message processing
process_msg();

// Vídeo: eventos dos workers, tempo máximo e limpeza (spec 000, D3, D11)
require("./video/events").startEventConsumer();
require("./video/watchdog").startWatchdog();
require("./video/janitor").startJanitor();
setTimeout(() => {
  retryQueuedTasks().catch((error) => console.error("[video] recuperação de tarefas em fila falhou:", error.message));
}, 5000).unref();

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).jsonp(err);
});

module.exports = app;
