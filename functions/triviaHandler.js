import fs from 'fs';
import { parse } from 'csv-parse';
import stringSimilarity from 'string-similarity'
import { booleanCheckSimilarity } from './wordSimilarityAPI.js'
import { start } from 'repl';

//export the state and if the state is on the main interface should send every text here? 
// const questionCSVPath = 'assets/Trivia-Printable.csv'
const questionCSVPath = 'assets/Trivia-Printable-cleaned.csv'

export let triviaStateAndQuestion = {
    question: null,
    answer: null,
    timeStarted: null,
    triviaOn: false

}



export async function triviaStateManager() {

    if (triviaStateAndQuestion.triviaOn === true) {
        return `Trivia is already on,  the question is ${triviaStateAndQuestion.question} `
    }

    else if (triviaStateAndQuestion.triviaOn === false && Date.now() - triviaStateAndQuestion.timeStarted < 3 * 60 * 1000) {
        const remainingMs = 3 * 60 * 1000 - (Date.now() - triviaStateAndQuestion.timeStarted);
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        return `Trivia is on cooldown please wait ${minutes} minutes and ${seconds} seconds`;
    }

    else {
        await startTrivia()
        return `/me [Trivia]  ${triviaStateAndQuestion.question}`
    }


}

async function startTrivia() {
    let newQuestionPair = await getRandomQuestion()
    triviaStateAndQuestion = {
        question: newQuestionPair.question,
        answer: newQuestionPair.answer,
        timeStarted: Date.now(),
        triviaOn: true
    }
}

export async function getHint() {
    if (triviaStateAndQuestion.triviaOn === false) {
        return `There is no active Trivia.`
    }
    let ans = triviaStateAndQuestion.answer

    if (ans.length === 0) return ans;
    if (ans.length === 1) return '_';

    // Split into words
    const words = ans.split(' ');
    
    const hintWords = words.map(word => {
        if (word.length === 0) return '';
        if (word.length === 1) return word[0];
        
        // Always reveal first letter
        let hint = word[0];
        
        // If word is longer than 8 characters, reveal an additional random letter
        if (word.length > 8) {
            // Get random position from 1 to word.length-1 (excluding first letter)
            const randomPos = Math.floor(Math.random() * (word.length - 1)) + 1;
            
            // Build hint with first letter and random letter revealed
            hint = word.split('').map((char, index) => {
                if (index === 0 || index === randomPos) {
                    return char;
                }
                return '_';
            }).join('');
        } else {
            // For words 8 characters or less, just show first letter
            hint = word[0] + word.slice(1).replace(/./g, '_');
        }
        
        return hint;
    });
    
    return hintWords.join(' ');
}

export function stopTrivia() {
    triviaStateAndQuestion.triviaOn = false;
}

// export async function checkAnswer(answerToCheck) {
//     // Normalize both to lowercase for comparison
//     const normalizedAnswer = answerToCheck.toLowerCase().trim();
//     const normalizedCorrect = triviaStateAndQuestion.answer.toLowerCase().trim();

//     const isCorrectNumber = stringSimilarity.compareTwoStrings(
//         normalizedAnswer,
//         normalizedCorrect
//     );
//     console.log(`Similarity score = ${isCorrectNumber}`);

//     if (isCorrectNumber >= 0.50) {
//         console.log(`${answerToCheck} is correct`);
//         triviaStateAndQuestion.triviaOn = false;
//         return true;
//     } else {
//         console.log(`${answerToCheck} is false`);
//         return false;
//     }
// 

// }

export async function checkAnswer(answerToCheck) {
    // Normalize both to lowercase for comparison
    const normalizedAnswer = answerToCheck.toLowerCase().trim();
    console.log(`normalizedAnswer: ${normalizedAnswer}`)

    const normalizedCorrect = triviaStateAndQuestion.answer.toLowerCase().trim();
    console.log(`normalizedCorrect: ${normalizedCorrect}`)

    const verdict = await booleanCheckSimilarity(normalizedAnswer, normalizedCorrect)
    console.log(`verdict: ${verdict}`)

    if (verdict === true) {
        triviaStateAndQuestion.triviaOn = false;
        return verdict
    }
    return verdict
}


// Example output: { question: "What is Node.js?", answer: "A JavaScript runtime" }
async function getRandomQuestion(filePath = questionCSVPath) {
    const records = [];

    const parser = fs.createReadStream(filePath)
        .pipe(parse({
            columns: ['question', 'answer'],  // Assign column names manually
            skip_empty_lines: true
        }));

    for await (const record of parser) {
        records.push(record);
    }

    if (records.length === 0) {
        throw new Error('No questions found in CSV file');
    }

    const randomIndex = Math.floor(Math.random() * records.length);
    return records[randomIndex];
}


// testing
//const questionPair = await getRandomQuestion();
//console.log(questionPair);
