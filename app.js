require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// Encryption
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
  })
);

//Passport settings
app.use(session({
    secret: 'My little secret.',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//Mongoose connection setup
mongoose.connect('mongodb://localhost:27017/hangmanDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
mongoose.set('useCreateIndex', true);

//Mongoose schemas setup
const gameSchema = new mongoose.Schema({
    guessedWord: String,
    gameResult: String,
});
const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    googleId: String,
    games: [gameSchema],
});

//Adding passport-local-mongoose plugin to the Schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Game = new mongoose.model('Game', gameSchema);

const User = new mongoose.model('User', userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});



// GET requests ------------------------------------
app.get('/', function(req, res) {
    res.render('home');
});


app.get('/login', function(req, res) {
    res.render('login')
});

app.get('/register', function(req, res) {
    res.render('register')
});

app.get('/game', function(req, res) {
    if (req.isAuthenticated()) {
        res.render('game', {userName: req.user.username});
    } else {
        res.redirect('/');
    }
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
})

//POST requests ------------------------------------
app.post('/register', function(req, res) {
    User.register({
        email: req.body.email,
        username: req.body.username,
    }, req.body.password, function(err, user) {
        if (err) {
          console.log(err);
          res.redirect('/register');
        } else {
          passport.authenticate('local')(req, res, function() {
            res.redirect('/game');
          })
        }
      });
});




app.listen(3000 || process.env.PORT, function(err) {
    if (!err) {
        console.log('Server is running');
    }
});