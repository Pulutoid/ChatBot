const conversationHistory = new Map();

async function storeMessage(username, message, sender = "user") {
    if (!conversationHistory.has(username)) {
        conversationHistory.set(username, []);
    }
    conversationHistory.get(username).push({
        sender,
        message,
        timestamp: Date.now()
    });
}

async function getContext(username, limit = 2) {
    const history = conversationHistory.get(username)?.slice(-limit) || [];
    return history
        .map(entry => `${entry.sender}: ${entry.message}`)
        .join("\n");
}

export {
    storeMessage,
    getContext
}
