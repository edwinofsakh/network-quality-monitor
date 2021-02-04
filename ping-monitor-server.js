'use strict';

const debug = require('debug')('ping-monitor-server');
const fs = require('fs');
const readline = require('readline');
const express = require('express');
const { Server } = require('ws');
const { PingMonitor } = require('./utils/ping-monitor');
const { argv } = require('process');

const PORT = process.env.PORT || 4250;
const INDEX = '/views/index.html';

const app = express();

app.get('/', (_req, res) => res.sendFile(INDEX, { root: __dirname }));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server, path: '/websocket/' });

wss.on('connection', (ws) => {
    ws.on('message', (data) => onClientMessage(ws, data));
    ws.on('close', () => onClientClose());
});

const targets = argv.slice(2) || ['1.1.1.1'];
const options = { threshold: 500, timeout: 2000, interval: 2000, period: 5 };
const HISTORY_LIMIT = Math.ceil(1 * 24 * 60 / options.period);

const gSettings = { targets: targets, timeout: options.timeout, interval: options.interval, period: options.period };
const gHistory = {};

loadHistory()
    .then(() => {
        console.log(`Monitoring ${targets.join(', ')}`);

        targets.map(target => {
            if (!gHistory[target]) gHistory[target] = [];

            const monitor = new PingMonitor(target, options);

            monitor.on('error', err => console.log(`Error (${target}): ${err.message}`));
            monitor.on('start', () => { });
            monitor.on('stop', () => { });
            monitor.on('update', () => onUpdate(target, monitor));
            monitor.on('period', () => onPeriod(target, monitor));
            monitor.start();
            debug(`monitor for ${target} was started`);
        });
    })
    .catch(err => {
        console.log(err.message);
    });

async function loadHistory() {
    debug('loading history');

    const now = Date.now();
    const today = (new Date(now)).toISOString().slice(0, 10);
    const yesterday = (new Date(now - 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

    await loadHistoryFile(`history-${yesterday}.txt`);
    await loadHistoryFile(`history-${today}.txt`);

    Object.keys(gHistory).forEach(key => {
        debug(`history for ${key} was loaded`);
        gHistory[key] = gHistory[key].slice(-HISTORY_LIMIT);
    });
}

async function loadHistoryFile(filename) {
    return new Promise((resolve) => {
        try {
            const stream = fs.createReadStream(filename);
            stream.on('error', (err) => {
                if (err.code !== 'ENOENT') {
                    console.log(err.message);
                } else {
                    debug(`${filename} not found`);
                }

                resolve();
            });

            const rd = readline.createInterface({ input: stream });

            rd.on('line', line => {
                const item = JSON.parse(line);
                if (!gHistory[item.target]) gHistory[item.target] = [];
                gHistory[item.target].push(item);
            });

            rd.on('error', (err) => {
                console.log(err.message);
                resolve();
            });

            rd.on('close', () => {
                debug(`${filename} was parsed`);
                resolve();
            });
        } catch (err) {
            console.log(err.message);
            resolve();
        }
    });
}

function saveHistory(payload) {
    const suffix = (new Date()).toISOString().slice(0, 10);
    fs.appendFile(`history-${suffix}.txt`, JSON.stringify(payload) + '\n', (err) => {
        if (err) console.error(err);
    });
}

function onUpdate(target, monitor) {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({
            type: "ping-update",
            payload: {
                target: target,
                last: { status: monitor.last.status, ping: monitor.last.time },
                recent: monitor.recent,
                overall: monitor.overall
            }
        }));
    });
}

function onPeriod(target, monitor) {
    const payload = {
        date: Date.now(),
        target: target,
        stats: {
            sent: monitor.recent.sent,
            lost: monitor.recent.lost,
            ping: monitor.recent.stats,
            errors: monitor.recent.errors
        }
    };

    gHistory[target].push(payload);
    gHistory[target] = gHistory[target].slice(-HISTORY_LIMIT);

    wss.clients.forEach((client) => {
        client.send(JSON.stringify({ type: "ping-period", payload: payload }));
    });

    saveHistory(payload);
}

function onClientMessage(ws, data) {
    try {
        const msg = JSON.parse(data);
        switch (msg.type) {
            case 'open':
                ws.send(JSON.stringify({ type: "ping-settings", payload: gSettings }));
                ws.send(JSON.stringify({ type: "ping-history", payload: gHistory }));
                break;
            default:
                break;
        }
    } catch (e) {
        console.error(e);
    }
}

function onClientClose() {

}
