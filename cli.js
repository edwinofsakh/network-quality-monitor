const meow = require('meow');
const PingLogger = require('./ping-logger');

const cli = meow(`
	Usage
	  $ ping-logger <target>
	Options
	  --timeout -t     Timeout in milliseconds to wait for each reply
	  --verbose -v     Output more detailed information
`, {
	flags: {
		timeout: {
            type: 'number',
            default: 2000,
			alias: 'w'
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
