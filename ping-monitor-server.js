'use strict';

const debug = require('debug')('ping-monitor-server');
const fs = require('fs');
const readline = require('readline');
const express = require('express');
const { Server } = require('ws');
const { PingMonitor } = require('./utils/ping-monitor');
const { argv } = require('process');

/**
 * History item
 * @typedef {object} HistoryItem
 * @property {string} target - target
 * @property {number} date - date
 * @property {*} stats - stats
 */

const PORT = process.env.PORT || 4250;
const INDEX = '/views/index.html';
const DAY = 24 * 60 * 60 * 1000;

console.log();
console.log(`Ping Monitor Server`);

const app = express();

app.get('/', (_req, res) => res.sendFile(INDEX, { root: __dirname }));

const server = app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

const wss = new Server({ server, path: '/websocket/' });

wss.on('connection', (ws) => {
  ws.on('message', (data) => onClientMessage(ws, data));
  ws.on('close', () => onClientClose());
});

const arg = argv.slice(2);
const targets = arg.length ? arg : ['1.1.1.1'];
const options = { threshold: 500, timeout: 2000, interval: 2000, period: 5 };
const HISTORY_LIMIT = Math.ceil((2 * 24 * 60) / options.period);

const gSettings = {
  targets: targets,
  timeout: options.timeout,
  interval: options.interval,
  period: options.period,
};
/** @type {Record<string, HistoryItem[]>} */
const gHistory = {};

loadHistory()
  .then(() => {
    console.log(`Monitoring ${targets.join(', ')}`);

    targets.map((target) => {
      if (!gHistory[target]) gHistory[target] = [];

      const monitor = new PingMonitor(target, options);
      monitor.on('error', (err) => console.log(`Error (${target}): ${err.message}`));
      monitor.on('start', () => {});
      monitor.on('stop', () => {});
      monitor.on('update', () => onUpdate(target, monitor));
      monitor.on('period', (time) => onPeriod(target, monitor, time));
      monitor.start();
      debug(`monitor for ${target} was started`);
    });
  })
  .catch((err) => {
    console.log(err.message);
  });

/**
 * Loads history.
 */
async function loadHistory() {
  debug('loading history');

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - DAY).toISOString().slice(0, 10);

  await loadHistoryFile(`history-${yesterday}.txt`);
  await loadHistoryFile(`history-${today}.txt`);

  normalizeHistory();
  Object.keys(gHistory).forEach((key) => {
    debug(`history for ${key} was loaded`);
    gHistory[key] = gHistory[key].slice(-HISTORY_LIMIT);
  });
}

/**
 * Loads history file.
 * @param {string} filename - file name
 * @returns {Promise<void>}
 */
async function loadHistoryFile(filename) {
  const period = gSettings.period * 60 * 1000;

  return new Promise((resolve) => {
    try {
      const stream = fs.createReadStream(filename);
      stream.on(
        'error',
        /**
         * Error handler.
         * @param {Error & {code?: string}} err - error
         */
        (err) => {
          if (err.code !== 'ENOENT') {
            console.log(err.message);
          } else {
            debug(`${filename} not found`);
          }

          resolve();
        }
      );

      const rd = readline.createInterface({ input: stream });

      let count = 0;

      rd.on('line', (line) => {
        const item = JSON.parse(line);
        if (!gHistory[item.target]) gHistory[item.target] = [];
        item.date = align(item.date, period);
        gHistory[item.target].push(item);
        count++;
      });

      rd.on('error', (err) => {
        console.log(err.message);
        resolve();
      });

      rd.on('close', () => {
        debug(`read ${count} lines from ${filename}`);
        resolve();
      });
    } catch (err) {
      if (err && typeof err == 'object' && 'message' in err) {
        console.log(err.message);
      }
      resolve();
    }
  });
}

/**
 * Aligns timestamp.
 * @param {number} time - timestamp
 * @param {number} period - period
 * @returns {number}
 */
function align(time, period) {
  return Math.round(time / period) * period;
}

/**
 * Saves history.
 * @param {object} payload - payload
 */
function saveHistory(payload) {
  const suffix = new Date().toISOString().slice(0, 10);
  fs.appendFile(`history-${suffix}.txt`, JSON.stringify(payload) + '\n', (err) => {
    if (err) console.error(err);
  });
}

/**
 * Normalizes history.
 */
function normalizeHistory() {
  const period = gSettings.period * 60 * 1000;
  const now = Date.now();
  Object.keys(gHistory).forEach((target) => {
    const history = gHistory[target];
    const first = history[0].date;
    /** @type {Record<number, HistoryItem>} */
    const stats = {};
    history.forEach((item) => (stats[item.date] = item));

    gHistory[target] = [];
    for (let time = first; time < now; time = time + period) {
      gHistory[target].push(stats[time] ? stats[time] : { target: target, date: time, stats: null });
    }
  });
}

/**
 * Handle update event.
 * @param {string} target - target
 * @param {PingMonitor} monitor - monitor instance
 */
function onUpdate(target, monitor) {
  wss.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        type: 'ping-update',
        payload: {
          target: target,
          last: {
            status: monitor.last?.status,
            ping: monitor.last?.time,
          },
          recent: monitor.recent,
          overall: monitor.overall,
        },
      })
    );
  });
}

/**
 * Handle period event.
 * @param {string} target - target
 * @param {PingMonitor} monitor - monitor instance
 * @param {number} time - timestamp
 */
function onPeriod(target, monitor, time) {
  const payload = {
    date: time,
    target: target,
    stats: {
      sent: monitor.recent.sent,
      lost: monitor.recent.lost,
      ping: monitor.recent.stats,
      errors: monitor.recent.errors,
    },
  };

  gHistory[target].push(payload);
  gHistory[target] = gHistory[target].slice(-HISTORY_LIMIT);

  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type: 'ping-period', payload: payload }));
  });

  saveHistory(payload);
}

/**
 * Handle client message event.
 * @param {import("ws").WebSocket} ws - websocket instance
 * @param {*} data
 */
function onClientMessage(ws, data) {
  try {
    const msg = JSON.parse(data);
    switch (msg.type) {
      case 'open':
        ws.send(
          JSON.stringify({
            type: 'ping-settings',
            payload: gSettings,
          })
        );
        ws.send(JSON.stringify({ type: 'ping-history', payload: gHistory }));
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Handle close event.
 */
function onClientClose() {}
