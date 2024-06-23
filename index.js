const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { log } = console;

const app = express();
const port = process.env.PORT || 3000;

// Body parser 
app.use(bodyParser.urlencoded({ extended: true }));

// Static files 
app.use(express.static(path.join(__dirname, 'public')));

// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Blog routes (
app.get('/blog', (req, res) => {
    const posts = [
        { id: 1, title: 'First Post', content: 'This is the first blog post.' },
        { id: 2, title: 'Second Post', content: 'This is the second blog post.' }
    ];
    res.render(path.join(__dirname, 'views', 'blog', 'blog'), { posts });
});

app.get('/blog/compose', (req, res) => {
    res.render(path.join(__dirname, 'views', 'blog', 'compose'));
});

app.get('/blog/edit/:postId', (req, res) => {
    const postId = req.params.postId;
    const post = { id: postId, title: 'Edit Post', content: 'Edit this blog post.' };
    res.render(path.join(__dirname, 'views', 'blog', 'edit'), { post });
});

app.post('/blog/compose', (req, res) => {
    const { title, content } = req.body;
    log(`New blog post: ${title}, ${content}`);
    res.redirect('/blog');
});

app.listen(port, () => {
    log(`App running on http://localhost:${port}`);
});
