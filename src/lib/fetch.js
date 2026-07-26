const UA = 'tcg-events-prague/1.0 (+https://github.com/egrm/tcg-events-prague)';

/** fetch() with timeout, one retry, and non-2xx as errors. */
export async function get(url, { as = 'text', timeoutMs = 30000, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return as === 'json' ? await res.json() : await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}
