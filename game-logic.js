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
            answerArray[i] = `_`;
            if (word[i] == ` `) {
                answerArray[i] = ` `;
            } else {
                answerArray[i] = `_`;
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


const inputCheck = function(guess, callback) {
    if (guess !== null) {
        if (guess == `стоп`) {
            isGameFinished = true;
        } else if (guess.length > 1) {
            if (guess == word) {
              window.alert(`Вау, ты угадал слово целиком! Поздравляю с победой! Игра окончена :)`);
            } else {
              window.alert(`Неверно! Попробуй еще`);
            }
        } else {
            let isAlreadyTried = false;
            for (let letter of triedLetters) {
              if (letter == guess) {
                isAlreadyTried = true;
                window.alert(`"Внимательнее! Эта буква уже была"`);
              }
            }
            if (!isAlreadyTried) {
              let letterIsRight = false;
              for (let j = 0; j < word.length; j++) {
                if (word[j] === guess) {
                  letterIsRight = true;
                  answerArray[j] = guess;
                  triedLetters.push(guess);
                }
              }
              if (!letterIsRight) {
                wrongLetters.push(guess);
                triedLetters.push(guess);
                if (wrongLetters.length == 10) {
                  isGameFinished = true;
                  isWin = false;
                }
              }
            }
        }
    }
}

module.exports.startGame = startGame;
// module.exports.inputCheck = inputCheck;s

