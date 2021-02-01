'use strict';

const express = require('express');
const { Server } = require('ws');
const { PingMonitor } = require('./utils/ping-monitor');

const PORT = process.env.PORT || 3000;
const INDEX = '/views/index.html';

const app = express();

app.get('/', (_req, res) => res.sendFile(INDEX, { root: __dirname }));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server, path: '/websocket/' });

wss.on('connection', (ws) => {
    ws.on('message', (data) => onClientMessage(ws, data));
    ws.on('close', () => onClientClose());
});

const monitor = new PingMonitor();

monitor.on('error', err => console.log(err.message));
monitor.on('start', () => { });
monitor.on('stop', () => { });
monitor.on('update', onUpdate);
monitor.on('period', onPeriod);
monitor.start();

let history = [];
const settings = { target: monitor.target, timeout: monitor.options.timeout, interval: monitor.options.interval, period: monitor.options.period };

function onUpdate() {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({ 
            type: "ping-update", 
            payload: { 
                last: {status: monitor.last[2], ping: monitor.last[1]},
                recent: monitor.recent,
                overall: monitor.overall
            }
        }));
    });
}

function onPeriod() {
    const payload = {
        date: Date.now(),
        stats: {
            sent: monitor.recent.sent,
            lost: monitor.recent.lost,
            ping: monitor.recent.stats
        }
    };

    history.push(payload);
    history = history.slice(-100);

    wss.clients.forEach((client) => {
        client.send(JSON.stringify({ type: "ping-period", payload: payload }));
    });
}

function onClientMessage(ws, data) {
    try {
        const msg = JSON.parse(data);
        switch (msg.type) {
            case 'open':
                ws.send(JSON.stringify({ type: "ping-settings", payload: settings }));
                ws.send(JSON.stringify({ type: "ping-history", payload: history }));
                break;
            default:
                break;
        }
    } catch (e) {
        console.error(e);
    }
};

function onClientClose() { };
