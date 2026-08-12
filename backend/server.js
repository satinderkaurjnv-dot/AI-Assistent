const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const {
    connectMongoDB,
    getConversation,
    saveConversation,
    getAllConversations,
    deleteConversation
} = require("./mongodb");

const app = express();

// ============================================================
// BASIC APP SETUP
// ============================================================

app.use(express.json());

// ============================================================
// OPENAI
// ============================================================

if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is missing.");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 0
});

// You can change this in .env without editing server.js.
//
// Example:
// OPENAI_MODEL=gpt-4.1-mini
//
// If your API account supports another current model,
// you can change it there.

const OPENAI_MODEL =
    process.env.OPENAI_MODEL || "gpt-4.1-mini";

// ============================================================
// CORS
// ============================================================

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header
            // such as server-to-server requests.
            if (!origin) {
                return callback(null, true);
            }

            const allowed =
                origin.startsWith("https://ai-assistent-") ||
                origin.startsWith("http://192.168.1.8:8080") ||
                origin.startsWith("http://localhost:8080") ||
                origin.startsWith("http://127.0.0.1:8080");

            if (allowed) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type"
        ]
    })
);

// ============================================================
// SESSION
// ============================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "change-this-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            sameSite: "lax",

            secure:
                process.env.NODE_ENV === "production",

            maxAge:
                1000 * 60 * 60 * 8
        }
    })
);

// ============================================================
// FILES
// ============================================================

const knowledgePath =
    path.join(__dirname, "knowledge.json");

// ============================================================
// LOAD KNOWLEDGE
// ============================================================

let knowledge;

try {

    knowledge = JSON.parse(
        fs.readFileSync(
            knowledgePath,
            "utf8"
        )
    );

    console.log(
        "Mining Discovery knowledge.json loaded."
    );

} catch (error) {

    console.error(
        "Could not load knowledge.json:",
        error.message
    );

    process.exit(1);
}



function getRelevantKnowledge(question) {

    const q =
        String(question)
            .toLowerCase();

    const information = [];

    // ========================================================
    // COMPANY
    // ========================================================

    if (
        q.includes("mining discovery") ||
        q.includes("company") ||
        q.includes("website") ||
        q.includes("email") ||
        q.includes("contact")
    ) {

        if (knowledge.company) {

            if (knowledge.company.name) {
                information.push(
                    `Company name: ${knowledge.company.name}`
                );
            }

            if (knowledge.company.description) {
                information.push(
                    `Description: ${knowledge.company.description}`
                );
            }

            if (knowledge.company.website) {
                information.push(
                    `Website: ${knowledge.company.website}`
                );
            }

            if (knowledge.company.email) {
                information.push(
                    `Email: ${knowledge.company.email}`
                );
            }
        }
    }

    // ========================================================
    // SERVICES
    // ========================================================

    if (
        q.includes("service") ||
        q.includes("services") ||
        q.includes("offer") ||
        q.includes("provide") ||
        q.includes("marketing") ||
        q.includes("advertising") ||
        q.includes("branding") ||
        q.includes("website") ||
        q.includes("app") ||
        q.includes("design") ||
        q.includes("pr") ||
        q.includes("webinar")
    ) {

        if (
            Array.isArray(
                knowledge.services
            )
        ) {

            information.push(
                "Mining Discovery services:"
            );

            for (
                const service
                of knowledge.services
            ) {

                information.push(
                    `- ${service.name}: ${service.description}`
                );
            }
        }
    }

    // ========================================================
    // CONTENT
    // ========================================================

    if (
        q.includes("news") ||
        q.includes("content") ||
        q.includes("magazine") ||
        q.includes("newsletter") ||
        q.includes("gold") ||
        q.includes("copper")
    ) {

        if (
            Array.isArray(
                knowledge.content
            )
        ) {

            information.push(
                `Mining Discovery content includes: ${knowledge.content.join(", ")}`
            );
        }
    }

    // ========================================================
    // ABOUT
    // ========================================================

    if (
        q.includes("what is") ||
        q.includes("about") ||
        q.includes("who are")
    ) {

        if (knowledge.about) {

            if (
                knowledge.about.description
            ) {

                information.push(
                    `About Mining Discovery: ${knowledge.about.description}`
                );
            }

            if (
                Array.isArray(
                    knowledge.about.focus
                )
            ) {

                information.push(
                    `Mining Discovery focuses on: ${knowledge.about.focus.join(", ")}`
                );
            }
        }
    }

    return [
        ...new Set(information)
    ].join("\n");
}

// ============================================================
// MINING QUESTION CLASSIFIER
// ============================================================

function isMiningQuestion(question) {

    const q =
        String(question)
            .toLowerCase()
            .trim();

    // ========================================================
    // DIRECT MINING TOPICS
    // ========================================================

    const miningTopics = [

        // Core mining
        "mining",
        "mine",
        "mines",
        "miner",
        "miners",
        "mineral",
        "minerals",
        "ore",
        "ores",
        "orebody",
        "ore body",
        "deposit",
        "deposits",
        "mineral deposit",
        "mineral deposits",

        // Commodities
        "gold",
        "silver",
        "copper",
        "lithium",
        "bronze",
"brass",
"alloy",
"smelting",
"metallurgy",
        "coal",
        "nickel",
        "cobalt",
        "uranium",
        "zinc",
        "lead",
        "tin",
        "platinum",
        "palladium",
        "bauxite",
        "aluminium",
        "aluminum",
        "iron ore",
        "iron",
        "rare earth",
        "rare earths",
        "graphite",
        "manganese",
        "potash",

        // Exploration / geology
        "exploration",
        "mineral exploration",
        "exploration project",
        "exploration drilling",
        "drilling",
        "drill hole",
        "drill holes",
        "geology",
        "geological",
        "geologist",
        "geologists",
        "geochemistry",
        "geophysics",
        "resource estimation",
        "mineral resource",
        "mineral resources",
        "mineral reserve",
        "mineral reserves",

        // Mining methods
        "open pit",
        "open-pit",
        "open cut",
        "open-cut",
        "underground mining",
        "underground mine",
        "underground mines",
        "surface mining",
        "strip mining",
        "placer mining",
        "hard rock mining",
        "room and pillar",
        "longwall mining",
        "block caving",
        "sublevel caving",
        "cut and fill",
        "shrinkage stoping",
        "stoping",

        // Processing
        "ore processing",
        "mineral processing",
        "mineral beneficiation",
        "beneficiation",
        "crushing",
        "grinding",
        "flotation",
        "leaching",
        "smelting",
        "refining",
        "concentrate",
        "concentrator",
        "heap leaching",
        "cyanidation",
        "separation",

        // Operations
        "mine production",
        "mineral production",
        "ore production",
        "mine operation",
        "mine operations",
        "mining operation",
        "mining operations",
        "mine development",
        "mine construction",
        "mine planning",
        "mine plan",
        "production mining",

        // Equipment
        "mining equipment",
        "mining machinery",
        "mining machine",
        "haul truck",
        "haul trucks",
        "excavator",
        "excavators",
        "drill rig",
        "drill rigs",
        "dragline",
        "crusher",
        "conveyor",
        "mining technology",
        "loader",
        "dozer",
        "bulldozer",
        "shovel",

        // Safety
        "mine safety",
        "mining safety",
        "mine accident",
        "mining accident",
        "mine hazard",
        "mining hazard",
        "mine ventilation",
        "mining ventilation",
        "mine rescue",
        "mine emergency",
        "mining emergency",
        "ground control",
        "ground stability",
        "roof control",
        "roof fall",
        "mine fire",
        "explosion",
        "coal dust",
        "respirable dust",
        "silica dust",
        "silica exposure",
        "occupational safety",
        "occupational health",

        // MSHA
        "msha",
        "mine safety and health administration",
        "msha regulation",
        "msha regulations",
        "msha standard",
        "msha standards",
        "msha inspection",
        "msha inspector",
        "msha rule",
        "mine safety regulation",
        "mining safety regulation",

        // Lockout / tagout
        "loto",
        "lockout tagout",
        "lockout-tagout",
        "lockout/tagout",
        "lockout",
        "tagout",
        "energy isolation",
        "hazardous energy",
        "isolation procedure",
        "lock out tag out",

        // Regulation
        "mining regulation",
        "mining regulations",
        "mine regulation",
        "mine regulations",
        "mining law",
        "mining laws",
        "mining permit",
        "mining permits",
        "mining licence",
        "mining license",
        "mineral rights",
        "environmental permit",
        "environmental permits",
        "regulatory compliance",
        "mining compliance",

        // Environment
        "mining environment",
        "mining environmental",
        "environmental impact",
        "environmental impacts",
        "mine rehabilitation",
        "mine reclamation",
        "mining waste",
        "tailings",
        "mine water",
        "acid mine drainage",
        "mine closure",
        "mine closure plan",
        "environmental management",

        // Industry
        "mining company",
        "mining companies",
        "mining project",
        "mining projects",
        "mining industry",
        "mining sector",
        "mineral industry",
        "mining investment",
        "mining economics",
        "mining market",
        "mining business",
        "mining stocks",
        "mining shares",

        // Mining Discovery
        "mining discovery",
        "mining discovery website",
        "mining discovery services",

        // Company / industry updates
        "press release",
        "press releases",
        "company announcement",
        "company announcements",
        "exchange release",
        "regulatory filing",
        "regulatory filings",
        "sec filing",
        "sec filings"
    ];

    // ========================================================
    // DIRECT MATCH
    // ========================================================

    for (
        const topic
        of miningTopics
    ) {

        if (q.includes(topic)) {
            return true;
        }
    }

    // ========================================================
    // MINING COMPANIES
    // ========================================================

    const miningCompanies = [

        "bhp",
        "rio tinto",
        "newmont",
        "anglo american",
        "freeport",
        "freeport-mcmoran",
        "vale",
        "glencore",
        "barrick",
        "fortescue",
        "south32",
        "teck resources",
        "teck",
        "alcoa",
        "hindustan zinc",
        "vedanta",
        "coal india",
        "adani mining"
    ];

    const companyUpdateTerms = [

        "press release",
        "press releases",
        "announcement",
        "announcements",
        "filing",
        "filings",
        "sec filing",
        "sec filings",
        "exchange release",
        "regulatory filing",
        "company news",
        "latest news",
        "company update",
        "latest update"
    ];

    if (
        miningCompanies.some(
            company =>
                q.includes(company)
        ) &&
        companyUpdateTerms.some(
            term =>
                q.includes(term)
        )
    ) {

        return true;
    }

    // ========================================================
    // COMPANY + MINING CONTEXT
    // ========================================================

    const miningContextTerms = [

        "mining",
        "mine",
        "mines",
        "mineral",
        "minerals",
        "ore",
        "gold",
        "copper",
        "coal",
        "lithium",
        "nickel",
        "iron",
        "project",
        "projects",
        "production",
        "reserves",
        "resources",
        "exploration"
    ];

    if (
        miningCompanies.some(
            company =>
                q.includes(company)
        ) &&
        miningContextTerms.some(
            term =>
                q.includes(term)
        )
    ) {

        return true;
    }

    // ========================================================
    // GEOGRAPHY + MINING CONTEXT
    // ========================================================

    const geographicTerms = [

        "china",
        "australia",
        "india",
        "canada",
        "united states",
        "usa",
        "america",
        "brazil",
        "chile",
        "peru",
        "mexico",
        "argentina",
        "south africa",
        "africa",
        "ghana",
        "zambia",
        "zimbabwe",
        "democratic republic of congo",
        "drc",
        "congo",
        "tanzania",
        "namibia",
        "botswana",
        "morocco",
        "egypt",
        "saudi arabia",
        "indonesia",
        "philippines",
        "papua new guinea",
        "russia",
        "kazakhstan",
        "mongolia",
        "europe",
        "asia",
        "north america",
        "south america",
        "western australia",
        "queensland",
        "new south wales",
        "ontario",
        "british columbia",
        "alberta"
    ];

    const miningContext = [

        "industry",
        "sector",
        "production",
        "companies",
        "company",
        "projects",
        "project",
        "operations",
        "operation",
        "market",
        "exports",
        "export",
        "imports",
        "investment",
        "regulation",
        "regulations",
        "resources",
        "deposits",
        "output",
        "reserves",
        "mines",
        "mining",
        "minerals",
        "ore"
    ];

    const hasGeography =
        geographicTerms.some(
            term =>
                q.includes(term)
        );

    const hasMiningContext =
        miningContext.some(
            term =>
                q.includes(term)
        );

    if (
        hasGeography &&
        hasMiningContext
    ) {

        return true;
    }

    // ========================================================
    // QUESTION PATTERNS
    // ========================================================

    const miningPatterns = [

        /how many.*(mine|mines|mining|mineral|minerals)/i,

        /how much.*(gold|silver|copper|coal|lithium|iron|nickel|uranium)/i,

        /where.*(mine|mines|mining|gold|copper|lithium|coal|iron)/i,

        /which.*(mine|mines|mining|minerals|companies)/i,

        /largest.*(mine|mines|mining|gold|copper|coal|iron|lithium)/i,

        /biggest.*(mine|mines|mining|gold|copper|coal|iron|lithium)/i,

        /top.*(mining|mine|mines|mineral|minerals|companies)/i,

        /major.*(mine|mines|mining|minerals|companies|projects)/i,

        /future of.*mining/i,

        /history of.*mining/i,

        /economics of.*mining/i,

        /cost of.*mining/i,

        /process of.*mining/i,

        /how does.*mining/i,

        /how is.*(gold|copper|lithium|coal|iron|nickel).*mined/i,

        /what is.*(gold|copper|lithium|coal|iron|nickel).*mining/i,

        /major.*mining.*projects/i,

        /largest.*mining.*companies/i,

        /top.*mining.*companies/i
    ];

    if (
        miningPatterns.some(
            pattern =>
                pattern.test(q)
        )
    ) {

        return true;
    }

    return false;
}

// ============================================================
// CURRENT DATA / WEB SEARCH ROUTER
// ============================================================

function needsWebSearch(question) {

    const q =
        String(question)
            .toLowerCase()
            .trim();

    // ========================================================
    // CURRENT / LIVE KEYWORDS
    // ========================================================

    const currentKeywords = [

        "latest",
        "current",
        "today",
        "recent",
        "recently",
        "news",
        "price",
        "prices",
        "currently",
        "live",
        "now",
        "right now",
        "as of now",
        "as of today",
        "at present",
        "so far",
        "this year",
        "this month",
        "this week",
        "this quarter",

        "up to date",
        "up-to-date",

        "latest data",
        "latest figures",
        "current data",
        "current figures",

        "project status",
        "project update",
        "ownership",
        "market share",
        "market cap",

        "2025",
        "2026",
        "2027",
        "2028",
        "2029",

        // Company updates
        "press release",
        "press releases",
        "announcement",
        "announcements",
        "company announcement",
        "company update",
        "latest update",

        // Regulatory
        "sec filing",
        "sec filings",
        "filing",
        "filings",
        "exchange release",
        "regulatory filing",
        "regulatory filings",

        // Rankings
        "top 10",
        "top ten",
        "largest",
        "biggest",
        "leading",
        "ranked",
        "ranking",

        "who is the largest",
        "who is the biggest",
        "who are the largest",
        "who are the biggest",

        // Current amounts
        "how much is",
        "how many"
    ];

    // ========================================================
    // CURRENT DATA PATTERNS
    // ========================================================

    const currentDataPatterns = [

        /current.*production/i,

        /latest.*production/i,

        /production.*202[5-9]/i,

        /current.*reserves/i,

        /latest.*reserves/i,

        /current.*resources/i,

        /latest.*resources/i,

        /current.*revenue/i,

        /latest.*revenue/i,

        /current.*market/i,

        /latest.*market/i,

        /current.*status/i,

        /latest.*status/i,

        /current.*ownership/i,

        /latest.*ownership/i,

        /current.*price/i,

        /latest.*price/i,

        /current.*projects/i,

        /latest.*projects/i,

        /major.*mining.*projects/i,

        /top.*mining.*companies/i,

        /largest.*mining.*companies/i,

        /biggest.*mining.*companies/i,

        /current.*statistics/i,

        /latest.*statistics/i
    ];

    // ========================================================
    // COMMODITY PRICE
    // ========================================================

    const commodities = [
        "gold",
        "silver",
        "copper",
        "coal",
        "bronze",
"brass",
"alloy",
"smelting",
"metallurgy",
        "lithium",
        "iron",
        "nickel",
        "uranium",
        "zinc",
        "platinum",
        "palladium",
        "iron ore"
    ];

    const priceWords = [
        "price",
        "prices",
        "rate",
        "value"
    ];

    const hasCommodity =
        commodities.some(
            commodity =>
                q.includes(commodity)
        );

    const hasPriceWord =
        priceWords.some(
            word =>
                q.includes(word)
        );

    if (
        hasCommodity &&
        hasPriceWord
    ) {

        return true;
    }

    // ========================================================
    // CURRENT KEYWORDS
    // ========================================================

    if (
        currentKeywords.some(
            keyword =>
                q.includes(keyword)
        )
    ) {

        return true;
    }

    // ========================================================
    // CURRENT PATTERNS
    // ========================================================

    if (
        currentDataPatterns.some(
            pattern =>
                pattern.test(q)
        )
    ) {

        return true;
    }

    return false;
}

// ============================================================
// CLEAN AI RESPONSE
// ============================================================

function cleanAIResponse(text) {

    if (!text) {
        return "";
    }

    let cleaned =
        String(text).trim();

    // Remove markdown code fences
    cleaned =
        cleaned
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

    // If AI accidentally returns JSON,
    // extract "reply".
    try {

        const parsed =
            JSON.parse(cleaned);

        if (
            parsed &&
            typeof parsed.reply === "string"
        ) {

            return parsed.reply.trim();
        }

    } catch (error) {

        // Normal text response.
    }

    return cleaned;
}

// ============================================================
// SYSTEM INSTRUCTIONS
// ============================================================

function buildInstructions(useWebSearch) {

    const currentDate =
        new Date()
            .toISOString()
            .slice(0, 10);

    return `
You are the Mining Discovery AI Assistant.

You are a professional mining-focused AI assistant.

==================================================
SCOPE
==================================================

Answer ONLY questions related to:

- mining
- mines
- minerals
- commodities
- geology
- exploration
- mining companies
- mining projects
- mining production
- mineral reserves
- mineral resources
- mining equipment
- mineral processing
- mine safety
- mining regulations
- mining technology
- mining economics
- mining operations
- global mining industry

If the question is not related to mining, respond ONLY with:

"I'm a mining-focused AI assistant. I can only answer questions related to mining, minerals, mines, mining companies, mining projects, commodities, exploration, geology, processing, equipment, safety, regulations, and the global mining industry."

==================================================
WEB SEARCH
==================================================

Web search is ${useWebSearch ? "ENABLED" : "NOT NEEDED"} for this request.

Current server date: ${currentDate}.

When web search is enabled, USE IT whenever the question
requires information that can change over time.

Examples:

- latest
- current
- today
- recent
- recently
- now
- currently
- live
- right now
- this week
- this month
- this year
- current price
- current production
- current reserves
- current resources
- current revenue
- current ownership
- current project status
- latest company announcement
- latest mining announcement
- latest regulatory change
- latest statistics
- current statistics
- rankings
- largest mining companies
- biggest mining companies
- top mining companies
- latest mining projects

Do NOT answer current-data questions only from old model
knowledge when web search is available.

Never invent current information.

When current information is requested:

- Prefer the newest reliable information available.
- Check the date of the source.
- Clearly distinguish publication date, event date,
  and current status when relevant.
- Never present an old date as today's information.
- Never guess missing current data.

==================================================
COMMODITY PRICES
==================================================

When the user asks for the price of a commodity, interpret
the question as asking for the ACTUAL COMMODITY PRICE unless
the user explicitly asks for a stock, ETF, fund, futures
contract, or company share price.

==================================================
GOLD PRICE
==================================================
For GOLD:

"gold price" means the actual GOLD SPOT PRICE.

The expected market identifier is:

XAU/USD

For current gold-price questions:

- Use the web-search result for GOLD SPOT / XAU/USD.
- Prefer the most recent reliable market information available.
- Prefer a source with a current price or timestamp.
- Prefer established financial or commodity-market sources.
- Check that the source's price refers to the current date/session.

Do NOT substitute:

- GLD
- SPDR Gold Shares
- gold ETFs
- gold funds
- mining company stocks
- company shares
- company market capitalization
- gold futures

unless the user explicitly asks for one of these.

If a search result contains both gold spot information and
information about GLD, ETFs, stocks, or other financial
instruments, use ONLY the gold spot information.

For:

"latest gold price"
"gold price today"
"current gold price"
"what is the price of gold"

return ONLY:

"Gold spot price (XAU/USD) is approximately $X per troy ounce
as of [date/time]."

Do not include a "Stock market information" section.

Do not mention GLD.

Do not reproduce unrelated information from the search result.

If a current gold spot price cannot be reliably confirmed,
respond:

"I couldn't confirm a current live gold spot price from the available sources."



==================================================
LATEST MINING NEWS
==================================================

For questions asking for:

- latest mining news
- latest mining industry news
- today's mining news
- recent mining news
- latest company news
- latest mining announcements

USE WEB SEARCH when available.

Prefer:

- government agencies
- geological surveys
- regulatory authorities
- mining companies
- recognized industry organizations
- reputable news organizations

Clearly distinguish:

- publication date
- event date
- current status

Do not present an old article as today's news.

==================================================
MINING COMPANIES
==================================================

For current information about mining companies, use web
search when available.

Examples:

- current production
- current reserves
- current resources
- current ownership
- current projects
- latest announcement
- latest financial information
- latest company news
- current market position

Prefer:

- official company sources
- regulatory filings
- government sources
- reputable news organizations

Do not invent company information.

==================================================
RANKINGS
==================================================

For questions involving:

- largest
- biggest
- top
- leading
- number one
- highest
- lowest

use current web information when the ranking depends on
current data.

Always identify the ranking criterion.

Examples:

- largest by annual production
- largest by reserves
- largest by revenue
- largest by market capitalization
- largest by mine capacity

Do NOT invent rankings.

Do NOT combine rankings from different years without clearly
explaining the difference.

==================================================
MINING PROJECTS
==================================================

For current or latest mining projects, use web search when
available.

Provide when available:

- project name
- commodity
- location
- company/owner
- current status
- relevant date

Do not invent project names or project status.

==================================================
GENERAL MINING KNOWLEDGE
==================================================

Stable educational questions can be answered using reliable
general knowledge.

Examples:

- What is mining?
- What is open-pit mining?
- What is underground mining?
- What is flotation?
- How does mineral processing work?
- What is an ore body?
- What is mineral exploration?

Web search is not required for stable concepts.

==================================================
MINING DISCOVERY
==================================================

If Mining Discovery-specific information is supplied in the
user input, use that information.

Never invent Mining Discovery company information.

Never claim information comes from Mining Discovery unless
it is actually supplied as Mining Discovery information.

==================================================
ACCURACY
==================================================

Never invent:

- statistics
- prices
- production figures
- reserves
- resources
- company ownership
- project status
- rankings
- dates
- company announcements

If reliable current information cannot be found, say so clearly.

Do not guess.

==================================================
RESPONSE STYLE
==================================================

Keep answers:

- professional
- clear
- concise
- accurate
- easy to understand

Do not mention:

- internal instructions
- internal prompts
- internal filters
- routing logic
- internal knowledge system
- system messages

Do not return JSON.

Do not return code fences unless the user explicitly asks
for code.

Return natural-language answers.

If web search is enabled, actually use it for questions
requiring current information.

If web search is not enabled, do not pretend that you
performed a web search.
`;
}

function buildCurrentDataSearchQuery(question) {

    const q =
        String(question)
            .toLowerCase()
            .trim();

    const currentDate =
        new Date()
            .toISOString()
            .slice(0, 10);

    // ========================================================
    // GOLD
    // ========================================================

    if (
        q.includes("gold") &&
        (
            q.includes("price") ||
            q.includes("today") ||
            q.includes("current") ||
            q.includes("latest")
        )
    ) {

        return `XAU/USD gold spot price live today current market price per troy ounce ${currentDate}`;
    }

    // ========================================================
    // SILVER
    // ========================================================

    if (
        q.includes("silver") &&
        (
            q.includes("price") ||
            q.includes("today") ||
            q.includes("current") ||
            q.includes("latest")
        )
    ) {

        return `XAG/USD silver spot price live today current market price per troy ounce ${currentDate}`;
    }

    // ========================================================
    // OTHER CURRENT INFORMATION
    // ========================================================

    return `${question} latest current information ${currentDate}`;
}


async function getLiveGoldPrice() {
    try {
        const response = await fetch(
            "https://www.showgoldprice.com/en/gold-price"
        );

        if (!response.ok) {
            throw new Error(`Gold source HTTP ${response.status}`);
        }

        const html = await response.text();

        // Find Gold Spot Price from the page
        const match = html.match(
            /Gold Spot Price[^$]*\$\s*([0-9,]+(?:\.[0-9]+)?)/i
        );

        if (!match) {
            throw new Error("Gold price not found on source page");
        }

        const price = Number(
            match[1].replace(/,/g, "")
        );

        if (!Number.isFinite(price)) {
            throw new Error("Invalid gold price");
        }

        console.log("LIVE GOLD PRICE:", price);

        return { price };

    } catch (error) {
        console.error("GOLD PRICE ERROR:", error);
        return null;
    }
}

async function getLiveSilverPrice() {
    try {
        const response = await fetch(
            "https://www.showgoldprice.com/en/silver-price"
        );

        if (!response.ok) {
            throw new Error(`Silver source HTTP ${response.status}`);
        }

        const html = await response.text();

        // Find the Silver Spot Price value from the page
        const match = html.match(
            /Silver Spot Price[^$]*\$\s*([0-9,]+(?:\.[0-9]+)?)/i
        );

        if (!match) {
            throw new Error("Silver price not found on source page");
        }

        const price = Number(
            match[1].replace(/,/g, "")
        );

        if (!Number.isFinite(price)) {
            throw new Error("Invalid silver price");
        }

        console.log("LIVE SILVER PRICE:", price);

        return { price };

    } catch (error) {
        console.error("SILVER PRICE ERROR:", error);
        return null;
    }
}
// ============================================================
// CHAT API
// ============================================================

app.post("/chat", async (req, res) => {

    try {

        const userMessage =
            String(req.body.message || "")
                .trim();

        const q =
            userMessage.toLowerCase().trim();

        const conversationId =
            req.body.conversationId;

        // ====================================================
        // VALIDATION
        // ====================================================

        if (!userMessage) {

            return res.status(400).json({
                error: "Message is required"
            });
        }

        if (!conversationId) {

            return res.status(400).json({
                error: "conversationId is required"
            });
        }


                // ====================================================
        // GET CONVERSATION
        // ====================================================
const conversation =
    await getConversation(
        conversationId
    );

if (!Array.isArray(conversation.messages)) {
    conversation.messages = [];
}
        // ====================================================
        // SAVE USER MESSAGE
        // ====================================================

        conversation.messages.push({

            role: "client",

            content: userMessage,

            timestamp:
                new Date().toISOString()

        });


// ====================================================
// GOLD PRICE - DIRECT SOURCE
// ====================================================

const isGoldPriceQuestion =
    q.includes("gold") &&
    (
        q.includes("price") ||
        q.includes("today") ||
        q.includes("current") ||
        q.includes("latest") ||
        q.includes("live")
    );

if (isGoldPriceQuestion) {

    console.log("================================");
    console.log("GOLD PRICE REQUEST DETECTED");
    console.log("Using direct live source");
    console.log("================================");

    const goldData =
        await getLiveGoldPrice();

    if (
        !goldData ||
        typeof goldData.price !== "number" ||
        !Number.isFinite(goldData.price)
    ) {

        const reply =
            "I couldn't confirm a current live gold spot price.";

        conversation.messages.push({

            role: "ai",

            content: reply,

            timestamp:
                new Date().toISOString()

        });

        conversation.updatedAt =
            new Date().toISOString();

        await saveConversation(
    conversation
);

return res.json({
            reply
        });
    }

    console.log(
        "LIVE GOLD PRICE:",
        goldData.price
    );

    const reply =
        `Gold spot price (XAU/USD) is approximately $${goldData.price.toFixed(2)} per troy ounce.`;

    // ====================================================
    // SAVE GOLD AI RESPONSE
    // ====================================================

    conversation.messages.push({

        role: "ai",

        content: reply,

        timestamp:
            new Date().toISOString()

    });

    conversation.updatedAt =
        new Date().toISOString();

    await saveConversation(
    conversation
);
    // ====================================================
    // SEND GOLD RESPONSE
    // ====================================================

    return res.json({
        reply
    });
}
  // ====================================================
// SILVER PRICE - DIRECT SOURCE
// ====================================================

const isSilverPriceQuestion =
    q.includes("silver") &&
    (
        q.includes("price") ||
        q.includes("today") ||
        q.includes("current") ||
        q.includes("latest") ||
        q.includes("live")
    );

if (isSilverPriceQuestion) {

    console.log("SILVER PRICE REQUEST DETECTED");

    const silverData =
        await getLiveSilverPrice();

    if (
        !silverData ||
        !Number.isFinite(silverData.price)
    ) {

        const reply =
            "I couldn't confirm a current live silver spot price.";

        conversation.messages.push({

            role: "ai",

            content: reply,

            timestamp:
                new Date().toISOString()

        });

        conversation.updatedAt =
            new Date().toISOString();

      

       await saveConversation(
    conversation
);
        return res.json({
            reply
        });
    }

    const reply =
        `Silver spot price (XAG/USD) is approximately $${silverData.price.toFixed(2)} per troy ounce.`;

    // ====================================================
    // SAVE SILVER AI RESPONSE
    // ====================================================

    conversation.messages.push({

        role: "ai",

        content: reply,

        timestamp:
            new Date().toISOString()

    });

    conversation.updatedAt =
        new Date().toISOString();


await saveConversation(conversation);

    // ====================================================
    // SEND SILVER RESPONSE
    // ====================================================

    return res.json({
        reply
    });
}
        // ====================================================
        // MINING-ONLY FILTER
        // ====================================================

        if (
            !isMiningQuestion(
                userMessage
            )
        ) {

            const reply =
                "I'm a mining-focused AI assistant. I can only answer questions related to mining, minerals, mines, mining companies, mining projects, commodities, exploration, geology, processing, equipment, safety, regulations, and the global mining industry.";

            return res.json({
                reply
            });
        }



     


        // ====================================================
        // MINING DISCOVERY KNOWLEDGE
        // ====================================================

        const relevantKnowledge =
            getRelevantKnowledge(
                userMessage
            );

        // ====================================================
        // QUERY ROUTER
        // ====================================================

      const useWebSearch = needsWebSearch(userMessage);

const currentDataSearchQuery = useWebSearch
    ? buildCurrentDataSearchQuery(userMessage)
    : null;

console.log("User question:", userMessage);
console.log("Web search:", useWebSearch ? "YES" : "NO");
console.log("Search query:", currentDataSearchQuery);



        // ====================================================
        // BUILD TOOLS
        // ====================================================

        const tools =
            useWebSearch
                ? [
                    {
                        type: "web_search",
                        search_context_size: "high"
                    }
                ]
                : [];

        console.log(
            "OPENAI TOOLS:",
            tools.length
                ? "web_search"
                : "none"
        );

        // ====================================================
        // OPENAI REQUEST
        // ====================================================

        console.log(
            "OPENAI START:",
            new Date().toISOString()
        );

        console.time(
            "OPENAI_REQUEST"
        );






    
        const response =
            await openai.responses.create({

                model: OPENAI_MODEL,

                tools,

                instructions:
                    buildInstructions(
                        useWebSearch
                    ),

input: `
USER QUESTION:
${userMessage}

PRIMARY SEARCH QUERY:
${currentDataSearchQuery || "No web search required."}

MINING DISCOVERY INFORMATION:
${relevantKnowledge || "No specific Mining Discovery information was found."}

ROUTING RESULT:
Web search ${
    useWebSearch
        ? "is enabled for this question."
        : "is not required for this question."
}

IMPORTANT CURRENT DATA RULE:

For current price questions, after web search identifies a source,
open the source page and use the price shown on that source page.
Do not use the search-result snippet price if it differs from the
price on the opened source page. The final answer price must match
the opened source page.
If the user asks only for the silver commodity price, do not include
stock, ETF, or fund information such as SLV.

This is a current-data request.

If web search is enabled, you MUST use the web_search
tool before answering.

Do NOT answer current-data questions from memory.



IMPORTANT SOURCE VERIFICATION RULE:

When web search finds a source for a current price,
OPEN and READ the source page before answering.

The price in the final answer MUST be the price shown
on the opened source page.

Do NOT use the price from the search-result snippet
if it differs from the price on the source page.

If the search result says $58.38 but the opened source
page says $65.40, answer $65.40.

The source-page price and the answer price MUST match.

Use the PRIMARY SEARCH QUERY as the main search direction.

Prefer the newest reliable search result available.

Do not use an old historical article when a newer
current source is available.

Do not use an old PDF, archived report, or previous-month
price as today's current price when newer information
is available.

IMPORTANT GOLD PRICE RULE:

If the user asks for:

- gold price
- current gold price
- latest gold price
- gold price today

the user means:

GOLD SPOT PRICE / XAU/USD
per troy ounce.

Use the current XAU/USD spot price.

DO NOT substitute:

- GLD
- SPDR Gold Shares
- gold ETF
- gold fund
- gold mining stock
- mining company stock
- company share price
- company market capitalization
- gold futures

unless the user explicitly asks for one of them.

If multiple gold prices appear in search results:

1. Identify the result specifically referring to
   GOLD SPOT / XAU/USD.

2. Prefer the newest/current result.

3. Prefer a reliable financial or market-data source.

4. Do not use an older price when a newer current price
   is available.

5. Report the price as approximately current because
   market prices can change continuously.

Do NOT include GLD or stock-market information when the
user only asks for gold price.

Return a concise natural-language answer.

`
            });

        console.timeEnd(
            "OPENAI_REQUEST"
        );

        console.log(
            "OPENAI END:",
            new Date().toISOString()
        );

        // ====================================================
        // DEBUG RESPONSE
        // ====================================================

        console.log(
            "OPENAI RESPONSE RECEIVED"
        );
console.log("\n========== DEBUG ==========");



console.log("\nRAW OPENAI RESPONSE:");
console.dir(response, { depth: null });

console.log("========== END DEBUG ==========\n");
        // ====================================================
        // EXTRACT ANSWER
        // ====================================================

        const reply =
            cleanAIResponse(
                response.output_text ||
                "Sorry, I could not generate a response."
            );

        // ====================================================
        // SAVE AI RESPONSE
        // ====================================================

        conversation.messages.push({

            role: "ai",

            content: reply,

            timestamp:
                new Date().toISOString()

        });

        conversation.updatedAt =
            new Date().toISOString();

        // ====================================================
        // UPDATE CONVERSATION
        // ====================================================

      await saveConversation(conversation);
        // ====================================================
        // SEND RESPONSE
        // ====================================================

        return res.json({

            reply

        });

    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "SERVER ERROR:"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );

        return res.status(500).json({

            error: "AI response failed"

        });
    }
});

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post(
    "/admin/login",
    async (req, res) => {

        try {

            const {
                username,
                password
            } = req.body;

            if (
                !username ||
                !password
            ) {

                return res.status(400).json({
                    error:
                        "Username and password are required."
                });
            }

            const correctUsername =
                process.env.ADMIN_USERNAME;

            const correctPassword =
                process.env.ADMIN_PASSWORD;

            if (
                username !== correctUsername ||
                password !== correctPassword
            ) {

                return res.status(401).json({
                    error:
                        "Invalid username or password."
                });
            }

            req.session.isAdmin = true;

            return res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({
                error:
                    "Login failed."
            });
        }
    }
);

// ============================================================
// ADMIN LOGOUT
// ============================================================

app.post(
    "/admin/logout",
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "Logout failed."
                    });
                }

                return res.json({
                    success: true
                });
            }
        );
    }
);

// ============================================================
// CHECK ADMIN LOGIN
// ============================================================

app.get(
    "/admin/check",
    (req, res) => {

        return res.json({

            authenticated:
                req.session.isAdmin === true

        });
    }
);

// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

function requireAdmin(
    req,
    res,
    next
) {

    if (
        req.session.isAdmin !== true
    ) {

        return res.status(401).json({
            error:
                "Admin login required."
        });
    }

    next();
}
// ============================================================
// GET ALL CONVERSATIONS
// ============================================================

app.get(
    "/admin/conversations",
    requireAdmin,
    async (req, res) => {

        try {

            const conversations =
                await getAllConversations();

            return res.json(
                conversations
            );

        } catch (error) {

            console.error(
                "Could not load admin conversations:",
                error
            );

            return res.status(500).json({
                error:
                    "Could not load conversations"
            });
        }
    }
);
app.delete(
    "/admin/conversations/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await deleteConversation(
                    req.params.id
                );

            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({
                    error:
                        "Conversation not found"
                });
            }

            return res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "Delete conversation error:",
                error
            );

            return res.status(500).json({
                error:
                    "Could not delete conversation"
            });
        }
    }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/",
    (req, res) => {

        return res.json({

            success: true,

            message:
                "Mining Discovery AI server is running",

            model:
                OPENAI_MODEL

        });
    }
);

// ============================================================
// START SERVER
// ============================================================

const PORT =
    process.env.PORT || 3000;

if (
    require.main === module
) {


    connectMongoDB()
    .then(() => {

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `Mining Discovery AI server running on port ${PORT}`
                );

                console.log(
                    `OpenAI model: ${OPENAI_MODEL}`
                );

            }
        );

    })
    .catch(error => {

        console.error(
            "MongoDB connection failed:",
            error
        );

        process.exit(1);

    });


}



module.exports = app;