import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import documentsRouter from './routes/documents';
import { ensureUploadDir } from './services/documentService';
import { initializeOpenAI } from './services/aiService';

dotenv.config();

const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5050;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', documentsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});

if (process.env.OPENAI_API_KEY) {
  initializeOpenAI(process.env.OPENAI_API_KEY);
  console.log('OpenAI initialized');
} else {
  console.log('Running in local mode (no OpenAI API key)');
}

async function startServer() {
  try {
    await ensureUploadDir();
    const server = app.listen(PORT, () => {
      console.log(`✅ Backend server running on http://localhost:${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ API endpoint: http://localhost:${PORT}/api`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Error: Port ${PORT} is already in use.`);
        console.error(`❌ Please either:`);
        console.error(`   1. Close the process using port ${PORT}: lsof -i :${PORT} | xargs kill -9`);
        console.error(`   2. Or change the PORT in backend/.env file`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
