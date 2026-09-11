import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`[BACKEND] API ouvindo em http://localhost:${env.port}`);
  console.log(`[BACKEND] Webhook local: http://localhost:${env.port}/api/meta/webhook`);
  console.log(`[BACKEND] FRONTEND_URL: ${env.frontendUrl}`);
});