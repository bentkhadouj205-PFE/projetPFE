import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data).tunnels;
          // Look for tunnel pointing to port 5000 (Backend)
          const tunnel = tunnels.find((t) => t.config.addr.includes('5000'));
          if (tunnel) {
            resolve(tunnel.public_url);
          } else {
            // Fallback to first https tunnel
            const https = tunnels.find((t) => t.proto === 'https');
            resolve(https?.public_url);
          }
        } catch {
          reject('Could not parse ngrok response');
        }
      });
    }).on('error', () => reject('ngrok not running on port 4040 (Did you start it?)'));
  });
}

function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: ${filePath} not found. Skipping.`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`${key}=.*`), `${key}="${value}"`);
    } else {
      content += `\n${key}="${value}"`;
    }
    console.log(`✅ [${path.basename(path.dirname(filePath))}] ${key} updated`);
  }
  fs.writeFileSync(filePath, content);
}

console.log('🔍 Detecting ngrok tunnel (Backend: 5000)...');

getNgrokUrl().then((url) => {
  if (!url) {
    console.error('❌ Error: No ngrok URL detected.');
    return;
  }

  console.log(`\n🌐 ngrok URL detected: ${url}\n`);

  // 1. Update backend .env (Citizen activation links point to local React dashboard)
  updateEnvFile(
    path.join(__dirname, 'Backend-pfe', '.env'),
    { FRONTEND_URL: 'http://localhost:5173' }
  );

  // 2. Update frontend .env (Vite Dashboard points to the public ngrok Backend)
  updateEnvFile(
    path.join(__dirname, 'web', '.env'),
    {
      VITE_BACKEND_URL: url,
      VITE_API_BASE_URL: `${url}/api`
    }
  );

  console.log('\n🚀 All .env files updated! Now restart your frontend.');
}).catch((err) => {
  console.error('❌ Error:', err);
  console.log('💡 Tip: Start ngrok first: ngrok http 5000');
});
