import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentsRouter from './routes/documents.js';
import sessionsRouter from './routes/sessions.js';
import { ensureUploadDir } from './services/documentService.js';
import { initializeOpenAI } from './services/aiService.js';
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 5051;
// CORS configuration - support Vercel frontend and preview deployments
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', documentsRouter);
app.use('/api/sessions', sessionsRouter);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});
if (process.env.OPENAI_API_KEY) {
    initializeOpenAI(process.env.OPENAI_API_KEY);
    console.log('✅ OpenAI initialized');
}
else {
    console.log('⚠️  No OPENAI_API_KEY — running in local mode');
}
async function startServer() {
    try {
        await ensureUploadDir();
        const server = app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} already in use`);
            }
            else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
