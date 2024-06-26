const express = require('express');

const router = express.Router();

router.use((req, res, next) => {});

router.get('/', (req, res) => {
    res.render('dashboard', {req, res});
});
module.exports = router;