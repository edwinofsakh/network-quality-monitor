# NQM - Network Quality Monitor

Tools for long-term monitoring of network quality.

## Installation

### Local version

```bash
$ git clone https://github.com/edwinofsakh/network-quality-monitor.git
$ npm install
```

### Global version

**Note**: Currently it do not work well.

```bash
$ npm i -g network-quality-monitor
```

## Usage

### Ping Monitor

Local version
```bash
$ node ping-monitor-cli.js --help
```

Global version
```bash
$ ping-monitor --help
```

#### Example

```text
$ ping-monitor

PingMonitor for 1.1.1.1
Interval=2000ms, Timeout=2000ms, Period=15m
Results: results\ping-monitor-1653137432243.csv
Log:
 2022-05-21T12:50:32.249Z: Started

Latency (ms)         min   mdn   avg   90%   95%   99%   max
    Last 15 mins      15    18    19    25    26    29    29
    Overall           15    16    19    24    24    28    29

Packets                 sent  received      lost
    Last 15 mins          44        44         0 (0.0% loss)
    Overall               44        44         0 (0.0% loss)

Errors                            Last 15 mins       Overall
                                           N/A           N/A

Realtime Chart
   29 ┤                                       ╭╮
   28 ┤                                       ││
   28 ┤                                       ││
   27 ┤                                       ││
   27 ┤                                       ││
   26 ┤                          ╭╮           │╰╮
   26 ┤                          ││           │ │
   25 ┤   ╭╮              ╭╮     ││           │ │
   24 ┤   ││              ││     ││           │ │
   24 ┤   ││              ││     │╰╮          │ │
   23 ┤   ││              ││     │ │          │ │
   23 ┤   ││              ││     │ │          │ │
   22 ┤   ││              ││     │ │          │ │
   21 ┤   ││              ││     │ │          │ │
   21 ┤   ││        ╭╮    ││  ╭╮ │ │          │ │
   20 ┤   ││        ││    ││  ││ │ │          │ │
   20 ┤   ││    ╭╮  ││    ││  │╰╮│ │          │ │
   19 ┤╭╮ ││    ││╭╮││  ╭─╯│  │ ││ ╰╮   ╭╮  ╭╮│ │
   19 ┼───────────────────────────────────────────
   18 ┤││ ││  ╭╮│╰╯│││  │  │╭─╯ ││  │   │╰╮ │╰╯ │
   17 ┤││ ││  │││  │││  │  ││   ││  │   │ │ │   │
   17 ┤││ ││╭╮│││  ╰╯╰─╮│  ╰╯   ││  ╰──╮│ ╰─╯   ╰╮
   16 ┤││ │││││││      ││       ││     ││        │
   16 ┼╯│╭╯││╰╯││      ╰╯       ││     ╰╯        │
   15 ┤ ╰╯ ╰╯  ╰╯               ╰╯               ╰
| Success - 15ms
```

### Http Monitor

Local version
```bash
$ node http-monitor-cli.js --help
```

Global version
```bash
$ http-monitor --help
```

### Ping Monitor Server

It use env variable `PORT`. Default value it `4250`.

Local version
```bash
$ node ping-monitor-server.js 192.168.1.1 1.1.1.1
```

## Debugging

Set env variable `DEBUG=ping-monitor-server`

## TODO

- [ ] Support config file

## History

**0.3.0**

- Add web interface
- Add ability to ping multiple targets
- Add ability to store history on server

**0.2.0**

- Add statistics for period.

**0.1.0**

- First release.

## License

```
MIT License

Copyright (c) 2021 Sergey Panpurin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
