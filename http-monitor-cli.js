const meow = require('meow');
const HttpMonitor = require('./http-monitor');

const cli = meow(`
	Usage
	  $ node http-monitor-cli.js <target>
	Options
	  --interval -i    Time in milliseconds between requests
	  --verbose -v     Output more detailed information
	  --no-chart       Hide chart
	  --no-histogram   Hide histogram
	  --no-fullscreen  Disable fullscreen mode
`, {
	flags: {
		interval: {
            type: 'number',
            default: 2000,
			alias: 'i'
		},
		verbose: {
            type: 'boolean',
            default: false,
			alias: 'v'
		},
		chart: {
            type: 'boolean',
            default: true
		},
		histogram: {
            type: 'boolean',
            default: true
		},
		fullscreen: {
            type: 'boolean',
            default: true
		}
	}
});

httpMonitor = new HttpMonitor(cli.input[0], cli.flags);

httpMonitor.start();
