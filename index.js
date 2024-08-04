require('dotenv').config();

let isCI = process.env.CI;
if (isCI) console.log('> Starting in CI mode. Disabling authentication...')

const { log } = console;
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const fs = require('fs');

const app = express();

app.set('view engine', 'ejs');

var FileStore = require('session-file-store')(session);

app.use(session({
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
}));

// app.use(morgan('dev')); // log requests in dev format

// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream('./app.log', { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream })); // log requests in combined format to the file

// Define a format that includes the referrer
morgan.format('custom', 'Referrer: :referrer');
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

app.use('/', require('./landing.js'));
app.use('/dash', require('./dash.js'));

if (process.env.SERVER_PORT) {
  log('> Using ptero :D');
  process.env.PORT = process.env.SERVER_PORT;
}

app.listen(process.env.PORT, () => {
  log(`App online at port ${process.env.PORT}`);
});