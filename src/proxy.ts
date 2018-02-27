
import { Url, parse as parseUrl } from 'url';
import * as HttpProxyAgent from 'http-proxy-agent';
import * as HttpsProxyAgent from 'https-proxy-agent';

function getSystemProxyURL(requestURL: Url): string {
    if (requestURL.protocol === 'http:') {
        return process.env.HTTP_PROXY || process.env.http_proxy || undefined;
    } else if (requestURL.protocol === 'https:') {
        return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || undefined;
    }

    return undefined;
}

/*
 * Returns the proxy agent using the proxy url in the parameters or the system proxy. Returns null if no proxy found
 */
export function getProxyAgent(requestURL: Url, proxy?: string, strictSSL?: boolean): any {
    const proxyURL = proxy || getSystemProxyURL(requestURL);

    if (!proxyURL) {
        return undefined;
    }

    const proxyEndpoint = parseUrl(proxyURL);

    if (!/^https?:$/.test(proxyEndpoint.protocol)) {
        return undefined;
    }

    strictSSL = strictSSL || true;

    const opts = {
         host: proxyEndpoint.hostname,
         port: Number(proxyEndpoint.port),
         auth: proxyEndpoint.auth,
         rejectUnauthorized: strictSSL
     };

    return requestURL.protocol === 'http:' ? new HttpProxyAgent(opts) : new HttpsProxyAgent(opts);
}