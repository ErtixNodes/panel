const express = require('express');

const router = express.Router();

router.get('/', (req, res) => res.render('landing/index', {req, res}));
router.get('/stats', (req, res) => res.sendFile(__dirname + '/public/stats.html'));

router.get('/blog', (req, res) => res.render('blog', {req, res}));
router.get('/blog/:id', (req, res) => res.render('blogpost', {req, res}));

module.exports = router;