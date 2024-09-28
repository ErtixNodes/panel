require('dotenv').config();

let isCI = process.env.CI;
if (isCI) console.log('> Starting in CI mode. Disabling authentication...')

const { log } = console;
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const fs = require('fs');

const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.set('view engine', 'ejs');

const db = require('./db');
const SSH2 = require('ssh2');

var FileStore = require('session-file-store')(session);

var ses = session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie:  {
    maxAge: 1000 * 60 * 60 * 24 * 31
  },

  store: new FileStore({
    reapAsync: true,
    reapSyncFallback: true
  })
});
app.use(ses);
io.engine.use(ses);

// app.use(morgan('dev')); // log requests in dev format

// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream('./app.log', { flags: 'a' });
// app.use(morgan('combined', { stream: accessLogStream })); // log requests in combined format to the file

// Define a format that includes the referrer
morgan.format('custom', ':referrer | :url');
// Set up Morgan with the custom format
app.use(morgan('custom', { stream: accessLogStream }));

if (isCI) {
  console.log('Disabling auth...');
  log('> THIS CAN BE DANGEROUS. ONLY USE IN CI!')
  app.use((req, res, next) => {
    var user = {
      "id":"554344892827172884",
      "username":"bastothemax",
      "avatar":"0e6f00adce8fcbd1959c985676a4d80f",
      "discriminator":"0",
      "public_flags":4194432,
      "flags":4194432,
      "banner":null,
      "accent_color":16744960,
      "global_name":"BasToTheMax",
      "avatar_decoration_data":null,
      "banner_color":"#FF8200",
      "clan":null,
      "mfa_enabled":true,
      "locale":"en-US",
      "premium_type":0,
      "email":"example@mail.com",
      "verified":true
    }
    req.session.user = user;
    req.session.userID = user.id;
    next();
  });
}

app.get('/dash/style.css', (req, res) => {
  res.sendFile(__dirname + '/views/dash/style.css')
})

app.use('/', express.static(__dirname + '/static'));
app.use('/', require('./landing.js'));
app.use('/dash', require('./dash.js'));

if (process.env.SERVER_PORT) {
  log('> Using ptero :D');
  process.env.PORT = process.env.SERVER_PORT;
}

io.on('connection', (client) => {
  console.log('> Connected', client.request.session.userID);
  client.isAuth = false;

  var session = client.request.session;

  client.userID = session.userID;

  client.on('disconnect', () => {
    console.log('> Disconnected', client.request.session.userID);
  });

  if (!session.userID) {
    client.disconnect(true);
  }

  client.on('ID', async (vpsID) => {
    client.vpsID = vpsID;

    const vps = await db.VPS.findOne({
      userID: client.userID,
      proxID: vpsID
    });

    if (!vps) {
      client.emit("error", "No VPS found");
      client.disconnect(true);
    } else {
      client.emit("connecting");
    }

    var connData = {
      host: vps.ip,
      port: 22,
      username: 'root',
      password: vps.password
    };

    console.log(connData);

    const conn = new SSH2.Client();
    conn.on('ready', () => {
      //  CONNECT
      console.log('> Ready!');
      conn.shell((err, stream) => {
        console.log('> Shell!');
        if (err) {
          console.log(err);
          client.emit("error", err);
          return;
        }
        
        client.emit("data", 'Connected!');

        stream.on('close', () => {
          client.emit("error", 'CLOSED');
          conn.end();
          client.disconnect(true);
        });

        stream.on('data', (data) => {
          client.emit("data", data);
        });

        client.on('data', (data) => {
          stream.write(data);
        });
      });
      
    });
    conn.on('error', (err) => {
      console.log(err);
      client.emit("error", err);
      client.disconnect(true);
    });
    conn.connect(connData);
  });
});

server.listen(process.env.PORT, process.env.HOST, () => {
  log(`App online at ${process.env.HOST}:${process.env.PORT}`);
});