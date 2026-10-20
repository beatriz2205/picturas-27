// Ligação persistente ao RabbitMQ para o vídeo (spec 000, D3, D12; REQ-VID-COM-009, COM-019).
// O utils/rabbit_mq.js abre uma ligação por mensagem e lança exceções não tratadas quando o
// RabbitMQ está em baixo; aqui a ligação é única, com canal de confirmação e religação automática,
// para a aceitação de tarefas poder responder 503 em vez de derrubar o serviço.
const amqp = require("amqplib");

const URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
const EXCHANGE = "picturas";
const CANCEL_EXCHANGE = "video_cancel";
const EVENTS_QUEUE = "video_events_queue";
const WS_QUEUE = "ws_queue";
// Mesmas filas e argumentos de rabbitMQ/definitions.json (se diferirem, o assert falha)
const TASK_QUEUES = ["video_noop_queue", "video_trim_queue", "video_convert_queue", "video_filter_queue", "video_detect_queue"];
const RECONNECT_MS = 5000;
const CONFIRM_TIMEOUT_MS = 3000;

let conn = null;
let ch = null;
let connecting = null;
let eventsHandler = null;

async function setup(channel) {
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertExchange(CANCEL_EXCHANGE, "fanout", { durable: true });
  for (const q of TASK_QUEUES) {
    await channel.assertQueue(q, { durable: true, arguments: { "x-max-priority": 10 } });
    await channel.bindQueue(q, EXCHANGE, q);
  }
  await channel.assertQueue(EVENTS_QUEUE, { durable: true });
  await channel.bindQueue(EVENTS_QUEUE, EXCHANGE, EVENTS_QUEUE);
}

function scheduleReconnect() {
  setTimeout(() => connect().catch(() => {}), RECONNECT_MS).unref();
}

async function connect() {
  if (ch) return ch;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      const c = await amqp.connect(URL);
      c.on("error", (e) => console.error("[video] rabbitmq:", e.message));
      c.on("close", () => {
        conn = null;
        ch = null;
        console.error("[video] ligação ao RabbitMQ fechada; nova tentativa em 5 s");
        scheduleReconnect();
      });
      const channel = await c.createConfirmChannel();
      channel.on("error", (e) => console.error("[video] canal rabbitmq:", e.message));
      await setup(channel);
      conn = c;
      ch = channel;
      if (eventsHandler) await startConsumer(channel, eventsHandler);
      console.log("[video] ligado ao RabbitMQ");
      return channel;
    } catch (err) {
      console.error("[video] RabbitMQ indisponível:", err.message);
      scheduleReconnect();
      throw err;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

function isConnected() {
  return !!ch;
}

async function publish(exchange, routingKey, msg, options = {}) {
  const channel = ch || (await connect());
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(msg)), {
    contentType: "application/json",
    persistent: true,
    ...options,
  });
  let timer;
  try {
    await Promise.race([
      channel.waitForConfirms(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("confirmação do RabbitMQ não recebida")), CONFIRM_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Pedido de tarefa para o worker, com prioridade (Premium 10, Free 1)
function publishTask(queue, msg, priority) {
  return publish(EXCHANGE, queue, msg, { priority });
}

// Atualização para o wsGateway (contracts/ws-events.md). Falhas só ficam registadas: o estado
// continua disponível por GET e o cliente recarrega-o ao voltar a ligar.
function publishWs(msg) {
  return publish(EXCHANGE, WS_QUEUE, msg, { persistent: false }).catch((e) =>
    console.error("[video] falha ao publicar video-task-update:", e.message)
  );
}

// Cancelamento para todas as réplicas de workers (D12), best effort
function publishCancel(taskId) {
  return publish(CANCEL_EXCHANGE, "", { schemaVersion: 1, taskId: String(taskId) }, { persistent: false }).catch((e) =>
    console.error("[video] falha ao publicar video_cancel:", e.message)
  );
}

async function startConsumer(channel, handler) {
  await channel.prefetch(20);
  // Os eventos são tratados um de cada vez, pela ordem de chegada: em paralelo, um "completed" de uma
  // tarefa rápida podia ser tratado antes do "started" e o resultado era descartado.
  let chain = Promise.resolve();
  await channel.consume(
    EVENTS_QUEUE,
    (msg) => {
      chain = chain.then(() => handleOne(msg));
    },
    { noAck: false }
  );

  async function handleOne(msg) {
    if (!msg) return;
    let body;
    try {
      body = JSON.parse(msg.content.toString());
    } catch (_) {
      console.error("[video] evento ilegível descartado");
      return channel.ack(msg);
    }
    try {
      await handler(body);
      channel.ack(msg);
    } catch (err) {
      console.error("[video] erro ao tratar evento", body.type, body.taskId, err.message);
      // Segunda falha do mesmo evento: descartar para não bloquear os seguintes. A tarefa fica em
      // processing e o watchdog termina-a por tempo (com devolução da operação).
      if (msg.fields.redelivered) {
        console.error("[video] evento descartado depois de nova falha", body.type, body.taskId);
        try {
          channel.ack(msg);
        } catch (_) {}
        return;
      }
      // Primeira falha (erro transitório, por exemplo MongoDB): volta à fila depois de uma pausa
      await new Promise((r) => setTimeout(r, 1000));
      try {
        channel.nack(msg, false, true);
      } catch (_) {}
    }
  }
}

// Regista o consumidor de video_events_queue; volta a ser registado em cada religação
function consumeEvents(handler) {
  eventsHandler = handler;
  if (ch) return startConsumer(ch, handler);
  return connect().catch(() => {});
}

async function close() {
  eventsHandler = null;
  const c = conn;
  conn = null;
  ch = null;
  if (c) {
    c.removeAllListeners("close");
    await c.close().catch(() => {});
  }
}

module.exports = { connect, isConnected, publishTask, publishWs, publishCancel, consumeEvents, close, TASK_QUEUES, EVENTS_QUEUE };
