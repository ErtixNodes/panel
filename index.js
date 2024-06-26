const { log } = console;
const express = require('express');
const morgan = require('morgan');

const app = express();

app.use(morgan('dev')); // log requests in dev format

app.use('/', require('./landing.js'));

app.listen(3000, () => {
  log(`App online at port 3000`);
});