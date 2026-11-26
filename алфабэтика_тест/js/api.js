const Api = {
  tokenKey: 'alfabetica-token',
  get token() { return localStorage.getItem(this.tokenKey); },
  set token(value) {
    if (value) localStorage.setItem(this.tokenKey, value);
    else localStorage.removeItem(this.tokenKey);
  },
  async request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      const err = new Error('Сервер недоступен. Запустите бэкенд Алфабэтики.');
      err.offline = true;
      throw err;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error || (typeof json.detail === 'string' ? json.detail : 'Ошибка сервера'));
      err.status = res.status;
      throw err;
    }
    return json;
  },
};

const Auth = {
  user: null,
  guest: true,
  lastUserKey: 'alfabetica-last-user',

  async restore() {
    if (!Api.token) {
      this.user = null;
      this.guest = true;
      return;
    }
    try {
      const user = await Api.request('GET', '/api/me');
      await this.start(user);
    } catch (err) {
      const last = localStorage.getItem(this.lastUserKey);
      if (err.offline && last) {
        this.user = { login: last };
        this.guest = false;
        Store.load(last);
      } else {
        Api.token = null;
        this.user = null;
        this.guest = true;
      }
    }
  },

  async start(user) {
    this.user = user;
    this.guest = false;
    localStorage.setItem(this.lastUserKey, user.login);
    Store.load(user.login);
    const { data } = await Api.request('GET', '/api/progress');
    Store.applyServer(data);
  },

  async submit(mode, login, password) {
    const guestSnapshot = this.user ? null : {
      ...Store.data,
      done: { ...Store.data.done },
      dates: { ...Store.data.dates },
      metrics: Store.data.metrics ? JSON.parse(JSON.stringify(Store.data.metrics)) : { sessions: [] },
    };
    const { token, user } = await Api.request('POST', mode === 'register' ? '/api/register' : '/api/login', { login, password });
    Api.token = token;
    await this.start(user);
    const hadGuest = guestSnapshot && (
      Object.keys(guestSnapshot.done || {}).length
      || guestSnapshot.cubeScore
      || ((guestSnapshot.metrics && guestSnapshot.metrics.sessions) || []).length
    );
    if (hadGuest) {
      for (const [id, stars] of Object.entries(guestSnapshot.done || {})) {
        Store.data.done[id] = Math.max(Store.data.done[id] || 0, stars);
      }
      Store.data.dates = { ...guestSnapshot.dates, ...Store.data.dates };
      Store.data.cubeScore = Math.max(Store.data.cubeScore || 0, guestSnapshot.cubeScore || 0);
      Store.mergeMetrics(guestSnapshot.metrics);
      Store.save();
    }
  },

  logout() {
    clearTimeout(Store.syncTimer);
    Api.token = null;
    this.user = null;
    this.guest = true;
    localStorage.removeItem(this.lastUserKey);
    Store.load(null);
  },

  expired() {
    this.logout();
    toast('Сессия устарела, войди ещё раз');
    route();
  },
};

window.Auth = Auth;
