const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const routes = require('./routes'); // Assuming your routes file is named routes.js

const port = process.env.PORT || 11426;

// Initialize Express
const app = express();

// Setting up template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// bodyParser Initialized
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Use the routes defined in routes.js
app.use('/', routes);

app.listen(port, () => {
    console.log('Server is running on port ' + port);
});
