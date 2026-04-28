import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';

/** Decodifica entidades HTML básicas presentes em atributos value do form */
function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

/** Extrai todos os campos hidden de um formulário HTML */
function extractFormFields(html: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const regex = /<input[^>]+type=["']?hidden["']?[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
        const tag = match[0];
        const nameMatch  = tag.match(/name=["']([^"']+)["']/i);
        const valueMatch = tag.match(/value=["']([^"']*)["']/i);
        if (nameMatch) {
            fields[nameMatch[1]] = valueMatch ? decodeHtmlEntities(valueMatch[1]) : '';
        }
    }
    return fields;
}

/** Extrai o action do primeiro <form> encontrado */
function extractFormAction(html: string): string | null {
    const match = html.match(/<form[^>]+action=["']([^"']+)["']/i);
    return match ? decodeHtmlEntities(match[1]) : null;
}

export async function fetchNfsePdf(url: string, maxRedirects = 8): Promise<Buffer> {
    const agent = new https.Agent({
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    });

    const cookies: string[] = [];

    const captureCookies = (res: any) => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
            setCookie.forEach((c: string) => {
                const pair = c.split(';')[0];
                const key  = pair.split('=')[0];
                // substitui cookie existente com mesmo nome
                const idx = cookies.findIndex(ck => ck.startsWith(key + '='));
                if (idx >= 0) cookies[idx] = pair;
                else cookies.push(pair);
            });
        }
    };

    const makeHeaders = (extra: Record<string, any> = {}): Record<string, any> => ({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        ...(cookies.length > 0 ? { 'Cookie': cookies.join('; ') } : {}),
        ...extra,
    });

    const get = (targetUrl: string, depth: number): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            if (depth >= maxRedirects) return reject(new Error('Too many redirects'));

            const urlObj  = new URL(targetUrl);
            const isHttps = urlObj.protocol === 'https:';
            const lib     = isHttps ? https : http;

            const req = lib.get(targetUrl, {
                agent: isHttps ? agent : undefined,
                headers: makeHeaders({ 'Accept': 'application/pdf,text/html,*/*;q=0.8' }),
            }, (res: any) => {
                captureCookies(res);

                if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
                    const location = res.headers.location;
                    if (!location) return reject(new Error(`Redirect ${res.statusCode} sem Location`));
                    const next = location.startsWith('http') ? location : new URL(location, urlObj.origin).href;
                    console.log(`[NFSE_FETCH] GET redirect → ${next}`);
                    // Consome o body para liberar a conexão
                    res.resume();
                    return resolve(get(next, depth + 1));
                }

                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} em ${targetUrl}`));
                }

                const chunks: Buffer[] = [];
                res.on('data', (c: Buffer) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('error', reject);
            req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout GET')); });
        });
    };

    const post = (targetUrl: string, body: string, referer: string, depth: number): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            if (depth >= maxRedirects) return reject(new Error('Too many redirects'));

            const urlObj  = new URL(targetUrl);
            const isHttps = urlObj.protocol === 'https:';
            const lib     = isHttps ? https : http;

            const postHeaders = makeHeaders({
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
                'Referer':        referer,
                'Origin':         `${urlObj.protocol}//${urlObj.host}`,
                'Accept':         'application/pdf,text/html,*/*;q=0.8',
            });

            const req = (lib as typeof https).request({
                hostname: urlObj.hostname,
                port:     urlObj.port || (isHttps ? 443 : 80),
                path:     urlObj.pathname + urlObj.search,
                method:   'POST',
                headers:  postHeaders,
                agent:    isHttps ? agent : undefined,
            }, (res: any) => {
                captureCookies(res);

                if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
                    const location = res.headers.location;
                    if (!location) return reject(new Error(`POST redirect ${res.statusCode} sem Location`));
                    const next = location.startsWith('http') ? location : new URL(location, urlObj.origin).href;
                    console.log(`[NFSE_FETCH] POST redirect → ${next}`);
                    res.resume();
                    // Se redirect aponta para PDF direto, faz GET
                    return resolve(get(next, depth + 1));
                }

                const chunks: Buffer[] = [];
                res.on('data', (c: Buffer) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('error', reject);
            req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout POST')); });
            req.write(body);
            req.end();
        });
    };

    // ── Passo 1: GET na URL do viewer ──────────────────────────────────────
    console.log(`[NFSE_FETCH] Iniciando download: ${url}`);
    const viewerBuf = await get(url, 0);
    const viewerHtml = viewerBuf.toString('utf-8');
    const viewerLow  = viewerHtml.toLowerCase();

    // ── Passo 2: Já é PDF? ─────────────────────────────────────────────────
    if (viewerLow.includes('%pdf-') || viewerBuf[0] === 0x25 && viewerBuf[1] === 0x50) {
        console.log('[NFSE_FETCH] PDF obtido diretamente no Passo 1');
        return viewerBuf;
    }

    // ── Passo 3: Procurar link direto para .pdf no HTML ────────────────────
    const pdfLinkMatch = viewerHtml.match(/https?:\/\/[^"'\s]+\.pdf[^"'\s]*/i);
    if (pdfLinkMatch) {
        const pdfUrl = pdfLinkMatch[0];
        console.log(`[NFSE_FETCH] Link PDF encontrado no HTML: ${pdfUrl}`);
        const pdfBuf = await get(pdfUrl, 0);
        if (pdfBuf[0] === 0x25) return pdfBuf; // %PDF
    }

    // ── Passo 4: Extrair form e submeter via POST ──────────────────────────
    const formFields = extractFormFields(viewerHtml);
    const formAction  = extractFormAction(viewerHtml);

    console.log(`[NFSE_FETCH] Campos do form: ${JSON.stringify(Object.keys(formFields))}`);
    console.log(`[NFSE_FETCH] Form action: ${formAction}`);
    console.log(`[NFSE_FETCH] nfs token (100 chars): ${(formFields['nfs'] || '').substring(0, 100)}`);
    console.log(`[NFSE_FETCH] Cookies: ${cookies.join('; ').substring(0, 200)}`);

    if (!formFields['nfs'] && !formAction) {
        throw new Error('GINFES viewer sem form reconhecível. HTML: ' + viewerHtml.substring(0, 500));
    }

    // Monta URL de POST — usa action do form ou fallback para /report/exportacao
    const urlObj    = new URL(url);
    const actionRaw = formAction || '/report/exportacao';
    const postUrl   = actionRaw.startsWith('http')
        ? actionRaw
        : `${urlObj.protocol}//${urlObj.host}${actionRaw.startsWith('/') ? '' : '/report/'}${actionRaw}`;

    // Todos os campos hidden + forçar tipo=pdf
    const allFields = { ...formFields, tipo: 'pdf', imprime: '0' };
    const postBody  = Object.entries(allFields)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    console.log(`[NFSE_FETCH] POST para: ${postUrl} (${Buffer.byteLength(postBody)} bytes)`);

    const postResult = await post(postUrl, postBody, url, 0);
    const postLow    = postResult.toString('binary', 0, 1000).toLowerCase();

    if (postLow.includes('%pdf-') || postResult[0] === 0x25) {
        console.log('[NFSE_FETCH] PDF obtido via POST com sucesso');
        return postResult;
    }

    // Verificar se o POST retornou HTML com link de PDF
    const postHtml = postResult.toString('utf-8');
    const pdfLink2 = postHtml.match(/https?:\/\/[^"'\s]+\.pdf[^"'\s]*/i);
    if (pdfLink2) {
        console.log(`[NFSE_FETCH] Link PDF no retorno do POST: ${pdfLink2[0]}`);
        return get(pdfLink2[0], 0);
    }

    console.warn('[NFSE_FETCH] POST não retornou PDF. Resposta (200 chars):', postHtml.substring(0, 200));
    throw new Error('GINFES não retornou PDF após POST. Verifique logs [NFSE_FETCH].');
}
