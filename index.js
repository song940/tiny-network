const net = require('net');
const http = require('http');
const https = require('https');
const assert = require('assert');
const Stream = require('stream');

const request = (method, url, payload, headers) => {
  const client = url.startsWith('https://') ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method,
      headers,
    }, resolve);
    req.once('error', reject);
    if (payload instanceof Stream) {
      payload.pipe(req);
    } else {
      req.end(payload);
    }
  });
};

const get = (url, headers) =>
  request('get', url, '', headers);

const post = (url, payload, headers) =>
  request('post', url, payload, headers);

const readStream = stream => {
  const buffer = [];
  return new Promise((resolve, reject) => {
    stream
      .on('error', reject)
      .on('data', chunk => buffer.push(chunk))
      .on('end', () => resolve(Buffer.concat(buffer)))
  });
};

const getJSON = (url, headers) =>
  Promise
    .resolve()
    .then(() => get(url, headers))
    .then(readStream)
    .then(JSON.parse);

const ensureStatusCode = expected => {
  if (!Array.isArray(expected))
    expected = [expected];
  return res => {
    const { statusCode } = res;
    assert.ok(expected.includes(statusCode), `status code must be "${expected}" but actually "${statusCode}"`);
    return res;
  };
};

const cookieJar = (cookies = {}) => {
  return {
    cookies,
    get cookie() {
      return Object
        .keys(cookies)
        .map(key => `${key}=${cookies[key]}`).join('; ');
    },
    setCookie(res) {
      (res.headers['set-cookie'] || []).forEach(a => {
        const [b] = a.split(/;\s?/);
        const [k, v] = b.split('=');
        cookies[k] = v;
      });
      return res;
    },
    save() {

    },
    restore() {

    }
  };
};

const stringify = (obj, { encode = encodeURIComponent } = {}) =>
  Object
    .keys(obj)
    .reduce((arr, key) => {
      const value = obj[key];
      arr.push(encodeURIComponent(key) + `=${encode(value)}`);
      return arr;
    }, []).join('&');

const tcp = (host, port) => {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port }, () => resolve(socket));
  });
};

const buildForm = body => {
  const output = [];
  const uuid = (Date.now() + (Math.random() * 1e8 | 0)).toString(36);
  const boundary = `----WebKitFormBoundary${uuid}`;
  for (const key of Object.keys(body)) {
    const value = body[key];
    output.push("--" + boundary);
    output.push(`Content-Disposition: form-data; name="${key}"`);
    output.push('');
    output.push(value);
  }
  output.push('--' + boundary + '--');
  output.push('');
  const payload = output.join('\r\n');
  return { boundary, payload };
};

module.exports = {
  tcp,
  request,
  get,
  post,
  readStream,
  ensureStatusCode,
  cookieJar,
  stringify,
  getJSON,
  buildForm,
};