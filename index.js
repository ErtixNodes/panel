require('dotenv').config();

let isCI = process.env.CI;
if (isCI) console.log('> Starting in CI mode. Disabling authentication...')

const { log } = console;
const express = require('express');
const morgan = require('morgan');
const session = require('express-session')

const app = express();

var FileStore = require('session-file-store')(session);

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie:  {},

    store: new FileStore({
      reapAsync: true,
      reapSyncFallback: true
    })
}));

app.use(morgan('dev')); // log requests in dev format

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

app.listen(3000, () => {
  log(`App online at port 3000`);
});