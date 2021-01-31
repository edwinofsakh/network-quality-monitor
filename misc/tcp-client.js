console.log('Starting TCP Client...')

var net = require('net')

var client = new net.Socket()

client.connect(3000, '127.0.0.1', () => {
    console.log('Connected to server on 127.0.0.1:3000')

    var packet
    for (i = 0; i <= 20; i++) {
        packet = Buffer.alloc(4)
        packet.writeUInt32LE(i, 0)
        client.write(packet)

        console.log('Packet Counter sent: ' + i)
    }
})

client.on('error', (e) => {
    if (e.code == 'ECONNRESET') {
        console.error('Connection abnormally closed')
    } else if (e.code == 'ECONNREFUSED') {
        console.error('Connection refused. Server down?')
    } else {
        console.error('Unhandled error occurred:')
        console.error(e)
    }
})

client.on('close', () => {
    console.log('Connection closed')
})