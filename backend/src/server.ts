import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`[BACKEND] API ouvindo em http://localhost:${env.port}`);
  console.log(`[BACKEND] Webhook local: http://localhost:${env.port}/api/meta/webhook`);
  console.log(`[BACKEND] FRONTEND_URL: ${env.frontendUrl}`);
});
