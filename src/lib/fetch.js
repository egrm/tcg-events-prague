const UA = 'tcg-events-prague/1.0 (+https://github.com/egrm/tcg-events-prague)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** fetch() with timeout, retries (honest UA first, then browser UA), non-2xx as errors. */
export async function get(url, { as = 'text', timeoutMs = 30000, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': attempt < 2 ? UA : BROWSER_UA, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return as === 'json' ? await res.json() : await res.text();
    } catch (err) {
      lastErr = err.cause ? new Error(`${err.message} (${err.cause.code || err.cause.message}) for ${url}`) : err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}
