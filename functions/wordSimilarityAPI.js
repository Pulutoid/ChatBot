import 'dotenv/config';
async function checkSimilarity(user_input, correct_answer) {
    const url = 'https://api.abdullah-darwish.com/api/v1/checkSimilarity';

    try {
        const response = await fetch(url, {
            method: "POST",
            // FIX 2: Essential for sending raw JSON
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "user_input": user_input,
                "correct_answer": correct_answer
            }),
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        return result
    } catch (error) {
        console.error(error.message);
    }
}


//returns  [false, 'FAIL', 0, 0.6626808047294617 ]


export async function booleanCheckSimilarity(user_input, correct_answer) {

    const result = await checkSimilarity(user_input, correct_answer)
    console.log(result)
    const verdict = result[0]
    console.log(verdict)
    return verdict
}

