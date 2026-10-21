const amqp = require('amqplib/callback_api');

const rabbit_host = process.env.RABBITMQ_HOST;
const rabbit_port = process.env.RABBITMQ_PORT;
const rabbit_username = process.env.RABBITMQ_USER;
const rabbit_password = process.env.RABBITMQ_PASS;
const exchange = "picturas";

const rabbit_mq_sv = `amqp://${rabbit_username}:${rabbit_password}@${rabbit_host}:${rabbit_port}`;

function send_rabbit_msg(msg, queue) {
    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) throw err_sv;
        
        connection.createChannel( (err_conn, channel) => {
            if (err_conn) throw err_conn;
            
            channel.assertExchange(exchange, 'direct', {
                durable: true
            });

            channel.assertQueue(queue, { durable: true }, (queueErr) => {
                if (queueErr) throw queueErr;
                channel.bindQueue(queue, exchange, queue, {}, (bindErr) => {
                    if (bindErr) throw bindErr;
                    channel.publish(exchange, queue, Buffer.from(JSON.stringify(msg)));
                });
            });
        });
        
        setTimeout(() => {
            connection.close();
        }, 500);
    });
    
}

function read_rabbit_msg(queue, callback) {
    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) throw err_sv;

        connection.createChannel((err_conn, channel) => {
            if (err_conn) throw err_conn;

            channel.assertExchange(exchange, 'direct', {
                durable: true
              });

            channel.assertQueue(queue, { durable: true }, (err_queue, q) => {
                if(err_queue) throw err_queue;

                channel.consume(q.queue, (msg) => {
                if (msg != null) {
                    Promise.resolve(callback(msg))
                        .then(() => channel.ack(msg))
                        .catch((error) => {
                            console.error(`[rabbitmq] failed to process ${queue}:`, error.message);
                            channel.nack(msg, false, true);
                        });
                }
                }, {
                    noAck: false
                });
            });
        });
    });
}

module.exports = { send_rabbit_msg, read_rabbit_msg };
