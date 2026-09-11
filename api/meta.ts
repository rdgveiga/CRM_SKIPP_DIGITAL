import type { Request, Response } from 'express';
import app from './_app.js';

export default function handler(req: Request, res: Response): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.searchParams.get('path') ?? '';
  url.searchParams.delete('path');
  req.url = `/api/meta/${path}${url.search}`;
  app(req, res);
}
