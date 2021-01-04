const meow = require('meow');
const HttpMonitor = require('./http-monitor');

const cli = meow(`
	Usage
	  $ http-monitor <target>
	Options
	  --interval -i    Time in milliseconds between requests
	  --verbose -v     Output more detailed information
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
		}
	}
});

httpMonitor = new HttpMonitor(cli.input[0], cli.flags.interval);

httpMonitor.start();
