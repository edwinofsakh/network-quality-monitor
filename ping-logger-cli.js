const meow = require('meow');
const PingLogger = require('./ping-logger');

const cli = meow(`
	Usage
	  $ ping-logger <target>
	Options
	  --timeout -t     Ping request timeout in milliseconds
	  --interval -i    Time in milliseconds between requests
	  --no-save
	  --verbose -v     Output more detailed information
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
		verbose: {
            type: 'boolean',
            default: false,
			alias: 'v'
		}
	}
});

pingLogger = new PingLogger(cli.input[0], cli.flags);

pingLogger.start();
