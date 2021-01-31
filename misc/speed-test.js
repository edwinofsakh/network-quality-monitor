const http = require('http');
const crypto = require('crypto');

const logUpdate = require('log-update');
const { setInterval } = require('timers');

// const base = 'http://localhost:3000';
const host = 'network-tools.herokuapp.com';
const port = undefined;

const SPINNER = ['-', '\\', '|', '/'];

main().catch(err => console.error(err));

async function main() {
    let frame = 0;
    const id = setInterval(() => {
        frame = ++frame % SPINNER.length;
        logUpdate(SPINNER[frame]);
    }, 250);

    await download();
    await upload();

    clearInterval(id);
}

function download() {
    return new Promise((resolve, reject) => {
        logUpdate.clear();
        console.log('Downloading...');

        const options = {
            hostname: host,
            port: port,
            protocol: 'http:',
            path: '/download',
            method: 'GET',
            headers: {},
        };

        const req = http.request(options, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];
            
            logUpdate.clear();
            console.log(`Status: ${statusCode}`);

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
            } else if (contentType.indexOf('text/plain') === -1) {
                error = new Error(`Invalid content-type.\nExpected text/plain but received ${contentType}`);
            }

            if (error) {
                logUpdate.clear();
                console.error(error);
                // Consume response data to free up memory
                res.resume();
                reject(error);
                return;
            }

            res.setEncoding('utf8');
            let start, end;
            let rawData = '';
            res.on('data', (chunk) => {
                if (!rawData) {
                    start = Date.now();
                }
                rawData += chunk;
            });
            res.on('end', () => {
                end = Date.now();
                const size = rawData.length / 1024 / 1024;
                const time = end - start;
                logUpdate.clear();
                console.log(`${size}MB in ${time}ms ${(size / time * 8000).toFixed(2)} Mb/s`);
                resolve();
            });
        })
        
        req.on('error', (error) => {
            logUpdate.clear();
            console.error(error);
            reject(error);
        });

        req.end();
    });
}

function upload() {
    return new Promise((resolve, reject) => {
        logUpdate.clear();
        console.log('Uploading...');
        const content = crypto.randomBytes(1024 * 1024).toString('hex');

        const options = {
            hostname: host,
            port: port,
            protocol: 'http:',
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': content.length,
            },
        };
        
        const req = http.request(options, (res) => {
            const { statusCode } = res;

            logUpdate.clear();
            console.log(`Status: ${statusCode}`);

            res.on('data', (data) => {
                console.log(`Data: ${data}`);
                const size = content.length / 1024 / 1024;
                const time = parseFloat(res.headers['x-response-time']);
                console.log(`${size}MB in ${time}ms ${(size / time * 8000).toFixed(2)} Mb/s`);
                resolve();
            });
        });

        req.on('error', (error) => {
            logUpdate.clear();
            console.error(error);
            reject(error);
        });

        req.write(content);
        req.end();
    });
}