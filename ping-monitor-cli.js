const meow = require('meow');
const PingMonitor = require('./ping-monitor');

const cli = meow(`
	Usage
	  $ node ping-monitor-cli.js <target>
	Options
	  --timeout -t     Ping request timeout in milliseconds
	  --interval -i    Time in milliseconds between requests
	  --no-save        Do not save results
	  --no-histogram   Hide histogram
	  --verbose        Output more detailed information
`, {
	flags: {
		timeout: {
            type: 'number',
            default: 2000,
			alias: 't'
		},
		interval: {
            type: 'number',
            default: 2000,
			alias: 'i'
		},
		save: {
			type: 'boolean',
			default: true
		},
		histogram: {
			type: 'boolean',
			default: true
		},
		verbose: {
            type: 'boolean',
            default: false
		}
	}
});

pingMonitor = new PingMonitor(cli.input[0], cli.flags);
pingMonitor.start();
