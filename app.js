const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
  })
);
app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('home');
})

app.get('/register', function(req, res) {
    res.render('register');
})




app.listen(3000 || process.env.PORT, function(err) {
    if (!err) {
        console.log('Server is running');
    }
})