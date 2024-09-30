const express = require('express');

const db = require('./db');

const router = express.Router();

router.get('/', (req, res) => res.render('landing/index', {req, res}));
router.get('/stats', (req, res) => res.sendFile(__dirname + '/public/stats.html'));

router.get('/blog', async (req, res) => {
    const posts = await db.Blog.find();
    res.render('blog/list', {req, res, posts});
});
router.get('/blog/:id', async (req, res) => {
    const { id } = req.params;
    const post = await db.Blog.findOne({
        id
    });
    if (!post) return res.redirect('/blog');
    res.render('blog/post', {req, res, post});
});
router.get('/blog/:id', (req, res) => res.render('blog/post', {req, res}));

module.exports = router;