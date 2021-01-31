const WebSocket = require('ws');
const logUpdate = require('log-update');
const { DelayStatistics } = require('../utils/statistics');

const ws = new WebSocket('ws://network-tools.herokuapp.com/websocket/');
let nSent = 0;
let nReceived = 0;
let nFailed = 0;
const delay = new DelayStatistics(400, 10);
let gTest;

const args = process.argv.slice(2);
main(args[0]);

function main(interval) {
    ws.on('open', () => {
        console.log('Connection opened');

        gTest = setInterval(() => {
            ws.send(++nSent + ' - ' + Date.now());
        }, interval || 100);

        setInterval(() => {
            logUpdate(`Sent: ${nSent}, Received: ${nReceived}, Failed: ${nFailed}, Delay: ${delay.text}\n${delay.histogram.print()}`);
        }, 250);

        // setTimeout(() => {
        //     clearInterval(test);
        // }, 10000);
    });

    ws.on('message', (data) => {
        handleMessage(data, Date.now());
    });

    ws.on('error', (err) => {
        nFailed++;
        logUpdate.clear();
        console.log((new Date()).toISOString(), ' - Error:', err.message);
    });

    ws.on('close', (code, reason) => {
        nFailed++;
        logUpdate.clear();
        console.log((new Date()).toISOString(), ' - Closed', code, reason);
        if (gTest) {
            clearInterval(gTest);
        }
    });

    ws.on('unexpected-response', (req, res) => {
        console.log((new Date()).toISOString(), ' - Unexpected Response');
    });
}

function handleMessage(data, receivedTime) {
    const items = data.split(' - ');

    if (items[0] === 'time' && items[1]) {
        // example: time - 1610302878000
        return;
        // const server = new Date(parseInt(items[1]));
        // console.log(server.toISOString(), received - server + 'ms');
        // return;
    }

    if (items[0] && items[1] && items[2]) {
        nReceived++;
        // example: 2 - 1610302878000 - 1610302909000
        const sentTime = parseInt(items[1]);
        // const processed = parseInt(items[2]);
        // console.log('#' + items[0], processed - sent + 'ms', received - processed + 'ms', received - sent + 'ms');
        delay.update(receivedTime - sentTime);
        return;
    }

    logUpdate.clear();
    console.log('Unsupported message');
    return;
}
