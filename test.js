const https = require('https');
const logUpdate = require('log-update');
const { setInterval } = require('timers');
const { DelayStatistic } = require('./utils');

const requestTime = new DelayStatistic(10000);
const responseTime = new DelayStatistic(10000);
const overallTime = new DelayStatistic(10000);

let text = 'Loading...';

let i = 0;
let j = 0;
loadVersions(++i);

setInterval(() => {
  loadVersions(++i);
}, 2000);

function loadVersions(i) {
  const sent = new Date();
  https.get('https://network-tools.herokuapp.com/', (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    // Any 2xx status code signals a successful response but
    // here we're only checking for 200.
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // Consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const received = new Date();
      overallTime.update(received - sent);
      text = `Request sent : ${i}\n`;

      text += `Overall time : ${overallTime.text}\n`;
      try {
        const parsedData = JSON.parse(rawData);
        const processed = new Date(parsedData.time);
        requestTime.update(processed - sent);
        responseTime.update(received - processed);

        text += `Request time : ${requestTime.text}\n`;
        text += `Response time: ${responseTime.text}\n`;
      } catch (e) {
        logUpdate.clear();
        console.error(e.message);
      }

      logUpdate(prepareOutput(j, overallTime.chart, text));
    });
  }).on('error', (e) => {
    logUpdate.clear();
    console.error(`Got error: ${e.message}`);
  });
}

function prepareOutput(i, chart, text) {
  let output = `Network Monitor ${i}\n${chart}\n${text}`;
  const n = process.stdout.rows - output.split(/\r\n|\r|\n/).length - 1;
  for (let i = 0; i< n; i++) {
    output += '\n';
  }

  return output;
}

setInterval(() => {
  logUpdate(prepareOutput(++j, overallTime.chart, text));
}, 200);