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

app.use(express.urlencoded({  extended: true }));

var multer = require('multer');
var upload = multer();

app.use(upload.array()); 

app.post('/bitco', async (req, res) => {
  console.log('web', req.query, req.body);

  const { subId, reward, status } = req.body;

  if (!subId ||!reward ||!status) return res.status(400).type('txt').send('Missing parameters');

  var user = await db.User.findOne({
    userID: subId
  });

  if (!user) return res.status(404).type('txt').send('User not found');

  var credits = parseFloat(reward);

  if (status == '2') {
    credits = -credits;
  }

  user.balance += credits;
  await user.save();

  res.type('txt').send('OK');
});

io.on('connection', (client) => {
  console.log('> Connected', client.request.session.userID);
  client.isAuth = false;

  var session = client.request.session;

  client.userID = session.userID;

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
      return;
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
      conn.shell({
        env: {
          COLORTERM: 'truecolor'
        },
        term: 'xterm-256color',
        width: 640,
        height: 480
      }, (err, stream) => {
        console.log('> Shell!');
        if (err) {
          console.log(err);
          client.emit("error", err);
          return;
        }
        
        client.emit("connected");

        stream.on('close', () => {
          client.emit("error", 'CLOSED');
          conn.end();
          client.disconnect(true);
        });

        stream.on('data', (data) => {
          // console.log('Received:', String(data));
          console.log(vps.proxID, String(data));
          writeCMD(vps.proxID, String(data));
          client.emit("data", String(data));
        });

        client.on('data', (data) => {
          // writeCMD(vps.proxID, String(data));
          // console.log(vps.proxID, String(data));
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

    client.on('disconnect', () => {
      console.log('> Disconnected');
      try {
        conn.end();
      } catch (e) {
        console.log('ERROR disconnecting', e);
      }
    });
  });
});

app.get('/connect', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('No ID provided');

  console.log(`> CONNECT ${id}`);

  res.send('');
});

app.get('/cmd', (req, res) => {
  var { id, cmd } = req.query;
  if (!id) return res.status(400).send('No ID provided');
  if (!cmd) return res.status(400).send('No CMD provided');

  id = String(id);
  while(id.includes('debian')) id = id.replace('debian', '');
  while(id.includes('alpine')) id = id.replace('alpine', '');

  console.log(`> CMD ${id}: ${cmd}`);

  writeCMD(id, '\t' + cmd + '\n');

  res.send('');
});

server.listen(process.env.PORT, process.env.HOST, () => {
  log(`App online at ${process.env.HOST}:${process.env.PORT}`);
});

async function writeCMD(proxID, cmd) {
  var path = `./logs/${proxID}.txt`;
  if (!fs.existsSync(path)) fs.writeFileSync(path, '');

  fs.appendFileSync(path, String(cmd));
}