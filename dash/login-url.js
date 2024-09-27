const crypto = require('crypto');

async function handle(req, res) {
    const { db, oauth } = req;

    const url = await oauth.generateAuthUrl({
        scope: ["identify"],
        state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
    });
    res.redirect(url);
}

module.exports = handle;