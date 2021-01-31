console.log('Starting TCP Server...')

var net = require('net')

var server = net.createServer((session) => {
    console.log('Connection opened')

    session.on('data', (packet) => {
        var packet_counter = packet.readUInt32LE(0)

        console.log('Packet Counter received: ' + packet_counter)
    })

    session.on('error', (e) => {
        if (e.code == 'ECONNRESET') {
            console.log('Connection closed')
        } else {
            console.error('Unhandled session error occurred:')
            console.error(e)
        }
    })

    session.on('end', () => {
        console.log('Connection closed')
    })
})

server.on('error', (e) => {
    if (e.code == 'EADDRINUSE') {
        console.error('Port 3000 already in use')
    } else {
        console.error('Unhandled server error occurred:')
        console.error(e)
    }
})

server.listen(3000, '0.0.0.0')

console.log('TCP Server started on 0.0.0.0:3000')