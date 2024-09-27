const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', {
    userID: String,
    balance: Number,
    pteroID: Number,
    password: String,

    notif: Boolean,
    serverLimit: Number,

    nextEarnCuty: Number,
});

const VPS = mongoose.model('Server', {
    userID: String,
    proxID: Number,

    name: String,

    cost: Number,
    expiry: Number,
    status: String // creating | active
});

const Node = mongoose.model('Node', {
    name: String,
    nextID: Number,
    maxVPS: Number
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
    VPS,
    Earn,
    Node
};
