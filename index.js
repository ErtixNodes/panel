const { log } = console;
const express = require('express');
const morgan = require('morgan');
const session = require('express-session')

const app = express();

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }
}));

app.use(morgan('dev')); // log requests in dev format

app.use('/', require('./landing.js'));
app.use('/dash', require('./dash.js'));

app.listen(3000, () => {
  log(`App online at port 3000`);
});