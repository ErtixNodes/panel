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
    nextAFK: Number
});

const VPS = mongoose.model('Server', {
    userID: String,
    proxID: Number,

    name: String,

    sshPort: Number,
    password: String,
    ip: String,
    os: String,

    cost: Number,
    expiry: Number,
    status: String, // creating | active | error
    uptimeType: String, // always | spot
    uptimeLeft: Number, // minutes of uptime left
    canStartAgain: Boolean, // can start the vps again after running out
    defaultUptime: Number, // default uptime in minutes
});

const Node = mongoose.model('Node', {
    name: String,
    nextID: Number,
    maxVPS: Number
});

const Port = mongoose.model('Port', {
    port: Number,
    isUsed: Boolean,
    vpsID: String,
    intPort: Number,
    isDone: Boolean
});

// Money
const Earn = mongoose.model('Earn', {
    userID: String,
    isUsed: Boolean,
    creditCount: Number,
    token: String,
    url: String
});

// Blog
const Blog = mongoose.model('Blog', {
    title: String,
    date: Number,
    content: String,
    id: String
});

module.exports = {
    User,
    VPS,
    Earn,
    Node,
    Port,
    Blog,

    mongoose
};
