"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const documents_1 = __importDefault(require("./routes/documents"));
const documentService_1 = require("./services/documentService");
const aiService_1 = require("./services/aiService");
dotenv_1.default.config();
const __dirname = path_1.default.dirname(__filename);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', documents_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
if (process.env.OPENAI_API_KEY) {
    (0, aiService_1.initializeOpenAI)(process.env.OPENAI_API_KEY);
    console.log('OpenAI initialized');
}
else {
    console.log('Running in local mode (no OpenAI API key)');
}
async function startServer() {
    try {
        await (0, documentService_1.ensureUploadDir)();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
