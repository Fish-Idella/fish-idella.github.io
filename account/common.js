/* ============================================================
   common.js —— 共享工具
   依赖后端接口：
     POST /api/account/login     {account, password, day}
     POST /api/account/register  {username, password, email, phone, nickname}
     POST /api/account/logout
     GET  /api/account/me
   后端统一响应：{ code, message, data }
     code = 0 成功；1001 参数错误；1002 用户已存在；1003 账号或密码错误；
     1004 未认证；1005 禁用；1006 锁定；1500 服务器错误
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- 后端 code 映射 ---------- */
  var CODE = {
    OK: 0,
    INVALID_PARAM: 1001,
    USER_EXISTS: 1002,
    CREDENTIAL_BAD: 1003,
    UNAUTHORIZED: 1004,
    USER_DISABLED: 1005,
    USER_LOCKED: 1006,
    FORBIDDEN: 1007,
    INTERNAL_ERROR: 1500
  };

  /* ---------- 页面路径 ---------- */
  var PAGE = {
    login: 'login.html',
    register: 'register.html',
    forgot: 'forgot.html',
    home: 'index.html'
  };

  /* ---------- 认证存储 ---------- */
  var TOKEN_KEY = 'account_token';
  var USER_KEY = 'account_user';

  var auth = {
    getToken: function () {
      try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
    },
    setToken: function (t) {
      try { localStorage.setItem(TOKEN_KEY, t || ''); } catch (e) {}
    },
    getUser: function () {
      try {
        var raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    setUser: function (u) {
      try {
        if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
        else localStorage.removeItem(USER_KEY);
      } catch (e) {}
    },
    clear: function () {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (e) {}
    },
    /** 只检查本地是否存有 token，不代表后端仍认可 */
    isLoggedIn: function () { return !!auth.getToken(); }
  };

  /* ---------- 请求封装 ---------- */
  /**
   * 统一请求。
   * @param {string} url
   * @param {object} [opts] { method, body, auth, silent401 }
   * @returns {Promise<{ok:boolean, http:number, code:number, message:string, data:any}>}
   */
  function request(url, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var headers = { 'Accept': 'application/json' };
    var body;

    if (opts.body !== undefined && opts.body !== null) {
      if (typeof FormData !== 'undefined' && opts.body instanceof FormData) {
        body = opts.body;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.body);
      }
    }

    // 默认带 token：Cookie 会自动带，这里额外加 Bearer，兼容移动端/第三方
    if (opts.auth !== false) {
      var tk = auth.getToken();
      if (tk) headers['Authorization'] = 'Bearer ' + tk;
    }

    return fetch(url, {
      method: method,
      headers: headers,
      body: body,
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        var out = {
          ok: res.ok,
          http: res.status,
          code: typeof json.code === 'number' ? json.code : (res.ok ? 0 : -1),
          message: json.message || '',
          data: json.data
        };

        // 认证失效：清理并跳登录（除非调用方声明 silent401）
        if ((out.http === 401 || out.code === CODE.UNAUTHORIZED) && !opts.silent401) {
          auth.clear();
          redirectToLogin();
        }
        return out;
      });
    }).catch(function (err) {
      return { ok: false, http: 0, code: -1, message: '网络异常，请检查连接后重试', data: null, error: err };
    });
  }

  /* ---------- 跳转 ---------- */
  function currentFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function redirectToLogin() {
    var here = currentFile();
    var url = PAGE.login;
    if (here && here !== PAGE.login) {
      url += '?redirect=' + encodeURIComponent(here + location.search);
    }
    location.replace(url);
  }

  /** 已登录用户访问 login/register/forgot 时，跳回首页 */
  function redirectIfLoggedIn() {
    if (!auth.isLoggedIn()) return;
    var here = currentFile();
    if (here === PAGE.login || here === PAGE.register || here === PAGE.forgot) {
      location.replace(PAGE.home);
    }
  }

  /* ---------- 页面守卫 ---------- */
  /**
   * 校验登录态。失败即跳登录页，并 resolve(false)。
   * 成功会把最新用户信息写入 localStorage 并 resolve(true)。
   */
  function requireLogin() {
    return request('/api/account/me', { method: 'GET' }).then(function (r) {
      if (r.ok && r.code === CODE.OK && r.data) {
        auth.setUser(r.data);
        return true;
      }
      // 401 已由 request 内部处理跳转
      if (r.http !== 401 && r.code !== CODE.UNAUTHORIZED) {
        auth.clear();
        redirectToLogin();
      }
      return false;
    });
  }

  /* ---------- UI 辅助 ---------- */
  function showAlert(el, type, msg) {
    if (!el) return;
    el.className = 'alert alert--' + (type || 'error') + ' is-show';
    el.innerHTML = '<span class="alert__icon">' + alertIcon(type) + '</span><span>' + escapeHtml(msg) + '</span>';
  }

  function hideAlert(el) {
    if (!el) return;
    el.classList.remove('is-show');
  }

  function alertIcon(type) {
    if (type === 'success') return '&#10003;';
    if (type === 'info') return '&#9432;';
    return '&#9888;';
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!loading);
    btn.disabled = !!loading;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 保留首尾各 2 位，中间替换为 **，与后端 accountMaskTail 一致 */
  function maskTail(s) {
    if (!s) return '';
    var arr = Array.from(s);
    var n = arr.length;
    if (n <= 2) return new Array(n + 1).join('*');
    return arr.slice(0, 2).join('') + '**' + arr.slice(n - 2).join('');
  }

  function initials(name) {
    if (!name) return '?';
    return String(name).trim().charAt(0).toUpperCase();
  }

  /* ---------- 表单校验（与后端一致） ---------- */
  var USERNAME_RE = /^[A-Za-z0-9_]+$/;

  var validate = {
    username: function (v) {
      v = (v || '').trim();
      if (v.length < 3 || v.length > 50) return '用户名长度需为 3~50 位';
      if (!USERNAME_RE.test(v)) return '用户名只能包含字母、数字、下划线';
      return '';
    },
    password: function (v) {
      v = v || '';
      if (v.length < 6 || v.length > 72) return '密码长度需为 6~72 位';
      return '';
    },
    email: function (v) {
      v = (v || '').trim();
      if (!v) return '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '邮箱格式不正确';
      if (v.length > 254) return '邮箱过长';
      return '';
    },
    phone: function (v) {
      v = (v || '').trim();
      if (!v) return '';
      if (!/^\d{6,20}$/.test(v)) return '手机号格式不正确';
      return '';
    },
    /** 返回 0~4 的密码强度 */
    strength: function (v) {
      v = v || '';
      if (!v) return 0;
      var s = 0;
      if (v.length >= 6) s++;
      if (v.length >= 10) s++;
      if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      return Math.min(s, 4);
    }
  };

  /* ---------- 导出 ---------- */
  global.App = {
    CODE: CODE,
    PAGE: PAGE,
    auth: auth,
    request: request,
    requireLogin: requireLogin,
    redirectToLogin: redirectToLogin,
    redirectIfLoggedIn: redirectIfLoggedIn,
    currentFile: currentFile,
    ui: {
      showAlert: showAlert,
      hideAlert: hideAlert,
      setLoading: setLoading,
      escapeHtml: escapeHtml,
      maskTail: maskTail,
      initials: initials
    },
    validate: validate
  };

})(window);