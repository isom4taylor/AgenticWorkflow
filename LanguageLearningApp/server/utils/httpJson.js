// Tiny promise wrapper around https.get for JSON APIs.

const https = require('https');

const DEFAULT_TIMEOUT_MS = 8000;

function httpsGetJson(hostname, path, { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname,
        path,
        timeout: timeoutMs,
        headers: {
          // Wikimedia asks API clients to identify themselves.
          'User-Agent': 'LanguageLearningApp/1.0 (self-hosted study app)',
          Accept: 'application/json',
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${hostname} responded with HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`${hostname} returned an unexpected (non-JSON) response.`));
          }
        });
      }
    );
    req.on('error', (err) => reject(new Error(`Could not reach ${hostname}: ${err.message}`)));
    req.on('timeout', () => req.destroy(new Error(`Request to ${hostname} timed out.`)));
  });
}

module.exports = { httpsGetJson };
