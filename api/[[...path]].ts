// Catch-all serverless function da Vercel.
// A Vercel roteia automaticamente TODO request sob /api/* para este arquivo,
// repassando o caminho completo ao app Express (rotas /api/...).
import { app } from '../backend/src/app';

export default app;