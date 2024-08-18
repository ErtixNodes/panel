const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', {
    userID: String,
    balance: Number,
    pteroID: Number,
    password: String,

    notif: Boolean,
    serverLimit: Number
});

const Server = mongoose.model('Server', {
    userID: String,
    pteroUID: String,
    pteroNID: Number,
    pteroLID: String,
    
    name: String,
    ram: Number,
    cpu: Number,
    disk: Number,

    cost: Number,
    lastPing: Number
});


// Money
const Earn = mongoose.model('Earn', {
    userID: String,
    isUsed: Boolean,
    creditCount: Number,
    token: String,
    url: String
});

module.exports = {
    User,
    Server,
    Earn
};
