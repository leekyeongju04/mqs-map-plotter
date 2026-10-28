import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
const app = express();
const port = 3000;
const httpServer = http.createServer(app);

app.use(express.json());

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
