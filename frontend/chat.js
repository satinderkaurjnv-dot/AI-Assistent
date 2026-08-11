const chatButton = document.getElementById("chat-button");
const chatWindow = document.getElementById("chat-window");
const closeChat = document.getElementById("close-chat");

const sendButton = document.getElementById("send-button");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");


// =========================
// CONVERSATION ID
// =========================

let conversationId =
    localStorage.getItem("miningDiscoveryConversationId");

if (!conversationId) {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        conversationId = window.crypto.randomUUID();
    } else {
        conversationId =
            "conversation-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 10);
    }

    localStorage.setItem(
        "miningDiscoveryConversationId",
        conversationId
    );
}


// =========================
// OPEN CHAT
// =========================

chatButton.addEventListener("click", () => {

    chatWindow.style.display = "flex";

    chatButton.style.display = "none";

    chatInput.focus();

});


// =========================
// CLOSE CHAT
// =========================

closeChat.addEventListener("click", () => {

    chatWindow.style.display = "none";

    chatButton.style.display = "block";

});


// =========================
// ADD MESSAGE
// =========================

function addMessage(text, type) {

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

   if (type === "bot") {

    const cleanText = text
        .replace(/\\\*/g, "*")
        .replace(/\\_/g, "_");

    message.innerHTML = marked.parse(cleanText);
} else {
        message.textContent = text;
    }

    chatMessages.appendChild(message);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return message;
}

// =========================
// SEND MESSAGE TO AI
// =========================

async function sendMessage() {

    const text = chatInput.value.trim();

    if (!text) {
        return;
    }

    // Show user's message
    addMessage(text, "user");

    chatInput.value = "";
    sendButton.disabled = true;

    // Show typing message
    const typingMessage = addMessage(
        "Thinking...",
        "bot"
    );

    try {

        const response = await fetch(
            "https://YOUR-BACKEND-VERCEL-URL.vercel.app/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: text,

                    conversationId:
                        conversationId

                })
            }
        );

        // Check server error
        if (!response.ok) {

            let errorMessage =
                "AI request failed";

            try {

                const errorData =
                    await response.json();

                errorMessage =
                    errorData.error ||
                    errorMessage;

            } catch (e) {
                // Ignore JSON parsing error
            }

            throw new Error(errorMessage);
        }


    // ======================================
// STREAMING RESPONSE
// ======================================

if (!response.body) {

    throw new Error(
        "Streaming is not supported by this browser."
    );

}

const reader =
    response.body.getReader();

const decoder =
    new TextDecoder("utf-8");

let fullReply = "";

let firstChunk = true;

while (true) {

    const { value, done } =
        await reader.read();

    if (done) {
        break;
    }

    const chunk =
        decoder.decode(
            value,
            { stream: true }
        );

    if (firstChunk) {

        typingMessage.innerHTML = "";

        firstChunk = false;

    }

    fullReply += chunk;

    const cleanText =
        fullReply
            .replace(/\\\*/g, "*")
            .replace(/\\_/g, "_");

    typingMessage.innerHTML =
        marked.parse(cleanText);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}

        // ======================================
        // FINAL RESPONSE
        // ======================================

        if (!fullReply.trim()) {

            typingMessage.innerHTML =
                "Sorry, I could not generate a response.";

        }


    } catch (error) {

        console.error(
            "Chat error:",
            error
        );


        typingMessage.remove();


        addMessage(
            "Sorry, I couldn't connect to the AI right now. Please try again.",
            "bot"
        );

    }


    sendButton.disabled = false;

    chatInput.focus();

}


// =========================
// SEND BUTTON
// =========================

sendButton.addEventListener(
    "click",
    sendMessage
);


// =========================
// ENTER TO SEND
// =========================

chatInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);