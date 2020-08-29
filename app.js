require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const hangmanGame = require('./game-logic.js');
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
const gameSchema = new mongoose.Schema ({
    userId: String,
    guessedWord: String,
    answerArray: Array,
    wrongLetters: Array,
    triedLetters: Array,
    isGameFinished: Boolean,
    isWin: Boolean,
    isCheat: Boolean,
});
const userSchema = new mongoose.Schema ({
    username: String,
    name: String,
    googleId: String,
    games: [gameSchema],
});

//Adding passport-local-mongoose plugin to the Schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Game = new mongoose.model('Game', gameSchema);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Function to check whether a user has unfinished game
const existingGameChecker = function(games, callback) {
    if(games.length !== 0) {
        async function findUnfinishedGame() {
            let foundGame;
            games.forEach(game => {
                if (game.isGameFinished === false) {
                    foundGame = game;
                }
            });
            return foundGame;
        }
        findUnfinishedGame().then(callback);
    } else {
        callback(null);
    }
}

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

app.get('/starting-page', function(req, res) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id, function(err, foundUser) {
            if (!err) {
                existingGameChecker(foundUser.games, function(foundGame) {
                    if (!foundGame) {
                        res.render('starting-page', {
                            userName: req.user.name,
                            buttonText: 'New game',
                            greetingText: `Let's play!`,
                        });
                    } else {
                        res.render('starting-page', {
                            userName: req.user.name,
                            buttonText: 'Continue game',
                            greetingText: `You have an unfinished game. Let's get back to it, shall we?`,
                        });
                    }
                });
            }
        });
    } else {
        res.redirect('/');
    }
});

app.get('/game', function(req, res) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id, function(err, foundUser) {
            if (!err) {
                existingGameChecker(foundUser.games, function(foundGame) {
                    if (!foundGame) {
                        hangmanGame.startGame(req.user, function(currentGame) {
                            if (!err) {
                                const newGame = new Game(currentGame);
                                foundUser.games.push(newGame);
                                foundUser.save(function(){
                                    res.render('game', {
                                        triesLeft: 7 - newGame.wrongLetters.length,
                                        wrongLetters: newGame.wrongLetters,
                                        wordArray: newGame.answerArray.join(' '),
                                        cheat: newGame.isCheat,
                                        cheatAnswer: newGame.guessedWord,
                                    });
                                });
                            }
                        });
                    } else {
                        res.render('game', {
                            triesLeft: 7 - foundGame.wrongLetters.length,
                            wrongLetters: foundGame.wrongLetters,
                            wordArray: foundGame.answerArray.join(' '),
                            cheat: foundGame.isCheat,
                            cheatAnswer: foundGame.guessedWord,
                        });
                    }
                })

            }
        })
    } else {
        res.redirect('/');
    }
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

//POST requests ------------------------------------
app.post('/register', function(req, res) {
    User.register({username: req.body.username, name: req.body.name}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/starting-page");
          });
        }
    });
});

app.post('/login', function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
      });
    
      req.login(user, function(err){
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/starting-page");
          });
        }
    });
});

app.post('/game', function(req, res) {
    const guess = req.body.guess.toLowerCase().trim();
    User.findById(req.user._id, function(err, foundUser) {
        if (!err) {
            foundUser.games.forEach(game => {
                if (game.isGameFinished === false) {
                    const currentGame = game;
                    if (guess) {
                        if (guess.length > 1) {
                            if (guess === 'stop') {
                                currentGame.isGameFinished = true;
                                foundUser.save(function(){
                                    res.redirect('/starting-page');
                                });
                            } else if (guess === 'cheatcode') {
                                currentGame.isCheat = true;
                                foundUser.save(function(){
                                    res.redirect('/game');
                                });
                            } else if (guess === currentGame.guessedWord) {
                                currentGame.isGameFinished = true;
                                currentGame.isWin = true;
                                foundUser.save(function(){
                                    res.render('win', {
                                        guessedWord: currentGame.guessedWord,
                                    });
                                });
                            } else {
                                res.redirect('/game');
                            }
                        } else {
                            let isAlreadyTried = false;
                            async function isAlredyTriedCheck() {
                                for (let letter of currentGame.triedLetters) {
                                    if (letter === guess) {
                                        isAlreadyTried = true;
                                        return isAlreadyTried;
                                    }
                                }
                            }

                            const letterOperations = function(isAlreadyTried) {
                                if (isAlreadyTried) {
                                    // window.alert('Внимательнее! Эта буква уже была');
                                    res.redirect('/game');
                                } else {
                                    let isLetterRight = false;
                                    async function isLetterCorrectCheck() {
                                        for (let i = 0; i < currentGame.guessedWord.length; i++) {
                                            if (currentGame.guessedWord[i] === guess) {
                                                isLetterRight = true;
                                                currentGame.answerArray.splice(i, 1, guess)
                                                currentGame.triedLetters.push(guess);
                                            }
                                        }
                                        return isLetterRight;
                                    }

                                    const letterDistribute = function(isLetterRight) {
                                        if (isLetterRight) {
                                            foundUser.save(function(){
                                                if (currentGame.answerArray.join('') === currentGame.guessedWord) {
                                                    currentGame.isGameFinished = true;
                                                    currentGame.isWin = true;
                                                    foundUser.save(function(){
                                                        res.render('win', {
                                                            guessedWord: currentGame.guessedWord,
                                                        });
                                                    });
                                                } else {
                                                    res.redirect('/game');
                                                }
                                            });
                                        } else {
                                            currentGame.wrongLetters.push(guess);
                                            currentGame.triedLetters.push(guess);
                                            foundUser.save(function(){
                                                if (currentGame.wrongLetters.length === 7) {
                                                    currentGame.isGameFinished = true;
                                                    currentGame.isWin = false;
                                                    foundUser.save(function() {
                                                        res.render('lose', {
                                                            guessedWord: currentGame.guessedWord,
                                                        });
                                                    })
                                                } else {
                                                    res.redirect('/game');
                                                }
                                                // res.redirect('/game');
                                            });
                                        }
                                    }
                                    isLetterCorrectCheck().then(letterDistribute);
                                }
                            }
                            isAlredyTriedCheck().then(letterOperations);
                        }
                    } else if (!guess) {
                        // window.alert('Input should not be empty!');
                        res.redirect('/game');
                    }
                }
            })
        }
    })
});




app.listen(3000 || process.env.PORT, function(err) {
    if (!err) {
        console.log('Server is running');
    }
});