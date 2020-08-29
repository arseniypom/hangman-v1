require('dotenv').config();
const https = require("https");
const bodyParser = require("body-parser");

const startGame = function startGame(playingUser, callback) {
    let wordsArray = [
        `house`, `cat`, `hat`, `backpack`, `car`, `stool`, `shirt`, `wardrobe`, `pillow`, `blanket`, `freedom`
    ];

    function getRandomWord(callback) {
        const randomNumber = Math.floor(Math.random() * wordsArray.length);
        const initialWord = wordsArray[randomNumber];
        const url = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${process.env.YANDEX_API}&lang=en-en&text=${initialWord}`;
        https.get(url, function(response) {
            response.on("data", function(data) {
                    const wordData = JSON.parse(data);
                    const synonymsObjects = wordData.def[0].tr[0].syn;
                    let synonymsArray = [];
                    for (let index of synonymsObjects) {
                    synonymsArray.push(index[`text`]);
                }
                const randomSynonymNumber = Math.floor(Math.random() * synonymsArray.length);
                const guessedWord = synonymsArray[randomSynonymNumber];
                callback(guessedWord);
                // return guessedWord;
            });
        });
    };

    getRandomWord(function(guessedWord) {
        let word = guessedWord.toLowerCase();
        let answerArray = [];
        for (let i = 0; i < word.length; i++) {
            answerArray[i] = `–`;
            if (word[i] == ` `) {
                answerArray[i] = `__`;
            } else {
                answerArray[i] = `–`;
            }
        }
        const newGame = {
            userId: playingUser._id,
            guessedWord: word,
            answerArray: answerArray,
            wrongLetters: [],
            triedLetters: [],
            isGameFinished: false,
            isWin: false,
        };
        callback(newGame)
    });
}


module.exports.startGame = startGame;

