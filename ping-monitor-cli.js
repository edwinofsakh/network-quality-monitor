const meow = require('meow');
const { PingMonitor } = require('./utils/ping-monitor');
const { MonitorClient } = require('./utils/client');

const cli = meow(
  `
	Usage
	  $ node ping-monitor-cli.js <target ip>
	Options
	  --timeout -t     Request timeout in milliseconds
	  --interval -i    Time between requests in milliseconds
	  --period -p      Period for calculating intermediate statistics in minutes
	  --no-save        Do not save results
	  --no-chart       Hide real time chart
	  --verbose        Show debug information
`,
  {
    description: 'PingMonitor helps you to monitor server availability',
    flags: {
      timeout: {
        type: 'number',
        default: 2000,
        alias: 't',
      },
      interval: {
        type: 'number',
        default: 2000,
        alias: 'i',
      },
      period: {
        type: 'number',
        default: 15,
        alias: 'p',
      },
      save: {
        type: 'boolean',
        default: true,
      },
      chart: {
        type: 'boolean',
        default: true,
      },
      verbose: {
        type: 'boolean',
        default: false,
      },
      testing: {
        type: 'boolean',
        default: false,
      },
    },
  }
);

const monitor = new PingMonitor(cli.input[0], cli.flags);
const client = new MonitorClient(monitor, cli.flags);
client.start();
