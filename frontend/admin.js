const API_URL = "http://127.0.0.1:3000";

const conversationList =
    document.getElementById("conversation-list");

const refreshButton =
    document.getElementById("refresh-button");

const emptyState =
    document.getElementById("empty-state");

const chatView =
    document.getElementById("chat-view");

const messagesContainer =
    document.getElementById("messages");

const conversationTitle =
    document.getElementById("conversation-title");

const deleteButton =
    document.getElementById("delete-button");

const logoutButton =
    document.getElementById("logout-button");

let conversations = [];

let selectedConversationId = null;


// ==========================================
// CHECK LOGIN
// ==========================================

async function checkAdminLogin() {

    try {

        const response = await fetch(
            `${API_URL}/admin/check`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Login check failed");
        }

        const data = await response.json();

        if (!data.authenticated) {

            window.location.href =
                "admin-login.html";

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Admin login check error:",
            error
        );

        conversationList.innerHTML =
            `
            <p class="loading">
                Could not connect to the AI server.
            </p>
            `;

        return false;
    }
}


// ==========================================
// LOAD CONVERSATIONS
// ==========================================

async function loadConversations() {

    conversationList.innerHTML =
        `
        <p class="loading">
            Loading conversations...
        </p>
        `;

    try {

        const response = await fetch(
            `${API_URL}/admin/conversations`,
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!response.ok) {

            if (response.status === 401) {

                window.location.href =
                    "admin-login.html";

                return;
            }

            throw new Error(
                `Server returned ${response.status}`
            );
        }

        conversations =
            await response.json();

        renderConversationList();

    } catch (error) {

        console.error(
            "Conversation loading error:",
            error
        );

        conversationList.innerHTML =
            `
            <p class="loading">
                Could not connect to the AI server.
            </p>
            `;
    }
}


// ==========================================
// RENDER CONVERSATION LIST
// ==========================================

function renderConversationList() {

    conversationList.innerHTML = "";

    if (conversations.length === 0) {

        conversationList.innerHTML =
            `
            <p class="loading">
                No conversations yet.
            </p>
            `;

        return;
    }

    const sorted =
        [...conversations].sort(
            (a, b) =>
                new Date(b.updatedAt) -
                new Date(a.updatedAt)
        );

    sorted.forEach(
        conversation => {

            const item =
                document.createElement("div");

            item.className =
                "conversation-item";

            if (
                conversation.id ===
                selectedConversationId
            ) {

                item.classList.add("active");
            }

            const firstClientMessage =
                conversation.messages.find(
                    message =>
                        message.role === "client"
                );

            const preview =
                firstClientMessage
                    ? firstClientMessage.content
                    : "No message";

            const date =
                new Date(
                    conversation.updatedAt
                );

            item.innerHTML =
                `
                <div class="conversation-date">
                    ${date.toLocaleString()}
                </div>

                <div class="conversation-preview">
                    ${escapeHtml(preview)}
                </div>

                <div class="conversation-count">
                    ${conversation.messages.length}
                    messages
                </div>
                `;

            item.addEventListener(
                "click",
                () => {
                    showConversation(
                        conversation.id
                    );
                }
            );

            conversationList.appendChild(item);
        }
    );
}


// ==========================================
// SHOW CONVERSATION
// ==========================================

function showConversation(id) {

    const conversation =
        conversations.find(
            item =>
                item.id === id
        );

    if (!conversation) {
        return;
    }

    selectedConversationId = id;

    emptyState.style.display =
        "none";

    chatView.style.display =
        "flex";

    conversationTitle.textContent =
        "Conversation";

    messagesContainer.innerHTML =
        "";

    conversation.messages.forEach(
        message => {

            const messageBox =
                document.createElement("div");

            messageBox.className =
                "admin-message " +
                (
                    message.role === "client"
                        ? "client"
                        : "ai"
                );

            const role =
                document.createElement("div");

            role.className =
                "message-role";

            role.textContent =
                message.role === "client"
                    ? "Client"
                    : "AI";

            const content =
                document.createElement("div");

            content.textContent =
                message.content;

            const time =
                document.createElement("div");

            time.className =
                "message-time";

            time.textContent =
                new Date(
                    message.timestamp
                ).toLocaleString();

            messageBox.appendChild(role);
            messageBox.appendChild(content);
            messageBox.appendChild(time);

            messagesContainer.appendChild(
                messageBox
            );
        }
    );

    renderConversationList();
}


// ==========================================
// DELETE CONVERSATION
// ==========================================

deleteButton.addEventListener(
    "click",
    async () => {

        if (!selectedConversationId) {
            return;
        }

        const confirmed =
            confirm(
                "Delete this conversation?"
            );

        if (!confirmed) {
            return;
        }

        try {

            const response =
                await fetch(
                    `${API_URL}/admin/conversations/${selectedConversationId}`,
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Delete failed"
                );
            }

            selectedConversationId =
                null;

            chatView.style.display =
                "none";

            emptyState.style.display =
                "block";

            await loadConversations();

        } catch (error) {

            console.error(error);

            alert(
                "Could not delete conversation."
            );
        }
    }
);


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await fetch(
                `${API_URL}/admin/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        } catch (error) {

            console.error(error);
        }

        window.location.href =
            "admin-login.html";
    }
);


// ==========================================
// REFRESH
// ==========================================

refreshButton.addEventListener(
    "click",
    loadConversations
);


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


// ==========================================
// START
// ==========================================

checkAdminLogin().then(
    loggedIn => {

        if (loggedIn) {
            loadConversations();
        }

    }
);