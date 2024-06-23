const express = require('express')

const app = express();

app.listen(3000, () => {
    log(`App online at port 3000`);
});