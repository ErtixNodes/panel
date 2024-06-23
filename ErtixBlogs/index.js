const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const fs = require('fs');
require('dotenv').config();

const port = process.env.PORT || 11426;
const postsFile = 'posts.json';

// Initialize Express
const app = express();

// Setting up template engine
app.set('view engine', 'ejs');

// bodyParser Initialized
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static('public'));

// Load posts from file
let posts = [];
if (fs.existsSync(postsFile)) {
    const data = fs.readFileSync(postsFile);
    posts = JSON.parse(data);
}

// Save posts to file
function savePosts() {
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
}

// Home Route
app.get('/', (req, res) => {
    res.render('home', { posts: posts, _:_ });
});

// Route for rendering a specific post
app.get('/posts/:postId', (req, res) => {
    const requestedId = req.params.postId;
    const post = posts.find(post => _.kebabCase(post.title) === requestedId);
    if (post) {
        res.render('post', { title: post.title, content: post.content, formattedDate: post.publishedOn });
    } else {
        res.status(404).send('Post not found');
    }
});

// Compose Route
app.get('/compose', (req, res) => {
    res.render('compose', { post: null, posts: posts });
});

// Edit Route
app.get('/compose/:postId', (req, res) => {
    const requestedId = req.params.postId;
    const post = posts.find(post => post.id === requestedId);
    if (post) {
        res.render('compose', { post: post, posts: posts });
    } else {
        res.status(404).send('Post not found');
    }
});

// Handle new post submission
app.post('/compose', (req, res) => {
    const { id, title, post } = req.body;
    if (id) {
        const existingPostIndex = posts.findIndex(p => p.id === id);
        if (existingPostIndex > -1) {
            posts[existingPostIndex] = { id, title, content: post, publishedOn: posts[existingPostIndex].publishedOn };
        }
    } else {
        const newPost = { id: _.kebabCase(title), title: title, content: post, publishedOn: new Date().toLocaleDateString() };
        posts.push(newPost);
    }
    savePosts();
    res.redirect('/');
});

// Handle post deletion
app.post('/delete/:postId', (req, res) => {
    const requestedId = req.params.postId;
    posts = posts.filter(post => post.id !== requestedId);
    savePosts();
    res.redirect('/compose');
});

app.listen(port, () => {
    console.log('Server is running on port ' + port);
});
