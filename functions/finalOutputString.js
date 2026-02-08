import { askAI } from "./ollamaAPI.js";
import { doubleCheckIsSafe } from "./banphraseHandler.js";
// import { getTriviaQuestion, decodeHtmlEntities } from "./triviaHandler.js";
import { getFact } from "./randomFactApi.js";
import { getAdvice } from "./randomAdviceApi.js";
import { getContext, storeMessage } from "./conversationHistory.js"
import { triviaStateAndQuestion, triviaStateManager, checkAnswer, stopTrivia, getHint } from "./triviaHandler.js";
import droll from 'droll';
import RPG from './RPG.js'

function sanitizeName(name) {
    return name.replace(/[<>]/g, "");
}

async function handleAskCommand(param) {

    let output = await askAI(param);
    if (output === "[?]") return "?";

    output = output.replace('.', '');
    output = output.replace(',', '');
    // return decodeHtmlEntities(output)
    return output
}

async function handleTriviaCommand() {
    return await getTriviaQuestion();
}

function handleHelpCommand() {
    return `Commands: ask, trivia, rpg (ues ${process.env.BOT_KEYWORD} rpg help for more),  roll (eg. ${process.env.BOT_KEYWORD} roll d20+2).`.trim();
}
async function handleRollCommand(param) {
    const diceToRoll = param.substring(param.indexOf("roll") + 5).trim();
    console.log(diceToRoll)

    var result = `${droll.roll(diceToRoll)}`;
    console.log(result)

    return result;
}
function handleRPGCommand(param, userId) {
    const subCommand = param.substring(param.indexOf("rpg") + 4).trim();
    var result = RPG(subCommand, userId);
    return result;
}



// Core router
export async function finalOutputString(param, chatterName, state) {
    let output = null;
    chatterName = sanitizeName(chatterName);
    const lowerParam = param.toLowerCase().trim();

    if (lowerParam.startsWith("test")) {
        output = "hello world";
    }
    else if (lowerParam.startsWith("1337")) {
        output = "hecking elite bro! BatChest";
    }
    else if (lowerParam.startsWith("ask") || lowerParam.startsWith("q")) {
        //check if previous context exist
        let context = await getContext(chatterName)

        let input = lowerParam
        input = input.substring(param.indexOf("ask") + 4).trim();
        // Returns: "user: hello\nbot: hi there\nuser: how are you"

        if (context) {
            input = `Previous conversation:\n${context}\n\nCurrent question: ${input}`;
        }
        console.log(`input for ask is : ${input}`)
        await storeMessage(chatterName, input)
        output = await handleAskCommand(input);
    }
    else if (lowerParam.startsWith("trivia")) {
        // return "/me [Trivia is disabled]"
        // return triviaStateManager();
        output = await triviaStateManager();
        if (output.startsWith("/me ")) {
            let specialOutput = output
            const isSafe = await doubleCheckIsSafe(specialOutput);
            specialOutput = !isSafe ? "[Blocked by Banphrase API]" : specialOutput;
            return `${specialOutput} `;
        }
    }
    else if (lowerParam.startsWith("help")) {
        output = handleHelpCommand();
    }
    else if (lowerParam.startsWith("roll")) {

        let rollResult = await handleRollCommand(lowerParam);
        output = rollResult
    }
    else if (lowerParam.startsWith("rpg")) {
        output = handleRPGCommand(lowerParam, chatterName);
    }
    else if (lowerParam.startsWith("fact") || lowerParam.startsWith("facts") || lowerParam.startsWith("fax")) {
        output = await getFact();
        output = " Did you know that " + output;
    }
    else if (lowerParam.startsWith("advice") || lowerParam.startsWith("advise") || lowerParam.startsWith("fax")) {
        output = await getAdvice();
        output = " Advice: " + output;
    }
    else if (lowerParam.startsWith("check trivia")) {
        const answerToCheck = param.substring(param.indexOf("check trivia") + 13).trim();
        // console.log(`checking for ${answerToCheck}`)
        // output = `checking for ${answerToCheck}`

        if (await checkAnswer(answerToCheck) === true) {

            output = `Correct! the answer is ${capitalizeFirstLetter(triviaStateAndQuestion.answer)}`
        }
        else if ((Date.now() - triviaStateAndQuestion.timeStarted) > 1.0 * 60 * 1000 && triviaStateAndQuestion.triviaOn) {
            stopTrivia();

            let specialOutput = `/me [Trivia] Times Up. the answer was ${capitalizeFirstLetter(triviaStateAndQuestion.answer)}`
            const isSpecialOutputSafe = await doubleCheckIsSafe(specialOutput);
            // output = !isSpecialOutputSafe ? "[Trivia answer Blocked by Banphrase API 1984 ]" : specialOutput;
            // return specialOutput;
            if (isSpecialOutputSafe) {
                return specialOutput
            }
            else {
                return "/me [Trivia answer Blocked by Banphrase API 1984]"
            }
        }
        else return

    }
    else if (lowerParam.startsWith("hint")) {
        output = await getHint();
    }
    else if (lowerParam.startsWith("streameronline")) {
        // output = "[disabled while stream is live]"
        output = null
    }



    // await storeMessage(chatterName, `my response to ${ chatterName }: ${ output }`)
    await storeMessage(chatterName, output, "bot");
    console.log(await getContext(chatterName))

    const isSafe = await doubleCheckIsSafe(output);
    output = !isSafe ? "[Blocked by Banphrase API 1984 ]" : output;
    return `@${chatterName}, ${output} `;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
