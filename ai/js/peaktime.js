/**
 * 高峰时段显示器
 * 三种状态：全天空闲 / 时段空闲 / 时段高峰
 */
const PeakTimeDisplay = (function () {
  // ========== 私有变量 ==========
  let holidayMap = {};
  let el = null;
  let timer = null;
  let lastHtml = '';

  // ========== 私有常量 ==========
  const BASE_URL = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master';
  const CACHE_PREFIX = 'holiday_cn_cache';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // 缓存有效期 7 天
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const PEAK_SLOTS = [
    { start: 9 * 60, end: 12 * 60 },
    { start: 14 * 60, end: 18 * 60 },
  ];

  const STATUS_STYLE = {
    'full-free': { color: '#27ae60', icon: '🌴', label: '全天空闲' },
    'free':      { color: '#e67e22', icon: '☕', label: '时段空闲' },
    'peak':      { color: '#e74c3c', icon: '🔥', label: '时段高峰' },
  };

  // ========== 私有方法 ==========

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatTime(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function isHoliday(dateStr) {
    return holidayMap[dateStr] === true;
  }

  /** 拉取指定年份的节假日数据 */
  async function fetchYear(year) {
    const url = `${BASE_URL}/${year}.json`;
    const key = `${CACHE_PREFIX}_${year}`;

    // 1. 尝试读取有效缓存
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.expireAt > Date.now() && cached.data) {
          return cached.data;
        }
      }
    } catch (e) { /* ignore */ }

    // 2. 从 CDN 拉取
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${year}`);
    const data = await resp.json();

    // 3. 写入带过期时间的缓存
    try {
      localStorage.setItem(key, JSON.stringify({
        expireAt: Date.now() + CACHE_TTL,
        data,
      }));
    } catch (e) { /* ignore */ }

    return data;
  }

  /** 应用一天的节假日数据 */
  function applyDays(days) {
    for (const d of days || []) {
      holidayMap[d.date] = d.isOffDay;
      if (d.isOffDay) {
        holidayMap[`${d.date}_name`] = d.name;
      }
    }
  }

  /**
   * 加载节假日数据：当前年 + 下一年
   * 下一年可能还没发布，失败就忽略
   */
  async function loadHolidayData() {
    const year = new Date().getFullYear();
    const results = await Promise.allSettled([
      fetchYear(year),
      fetchYear(year + 1),
    ]);

    holidayMap = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        applyDays(r.value.days);
      } else {
        console.warn('[PeakTimeDisplay] 数据加载失败:', r.reason && r.reason.message);
      }
    }
  }

  /**
   * 判断当前状态
   */
  function getStatus(now) {
    const dateStr = formatDate(now);
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = holidayMap[`${dateStr}_name`];

    // ① 全天空闲：法定节假日 或 周末
    if (isHoliday(dateStr) || isWeekend) {
      const detail = holidayName || (isWeekend ? '周末' : '');
      return { type: 'full-free', ...STATUS_STYLE['full-free'], detail };
    }

    // ② 工作日：检查是否在高峰时段
    const minutes = now.getHours() * 60 + now.getMinutes();
    const isPeak = PEAK_SLOTS.some(s => minutes >= s.start && minutes < s.end);
    const type = isPeak ? 'peak' : 'free';
    return { type, ...STATUS_STYLE[type], detail: '' };
  }

  /** 渲染 */
  function render() {
    if (!el) return;

    const now = new Date();
    const st = getStatus(now);
    const dateStr = formatDate(now);
    const dayOfWeek = WEEKDAYS[now.getDay()];
    const timeStr = formatTime(now);

    const detailHtml = st.detail
      ? `<span style="color:${st.color};font-weight:bold;margin-left:4px;">· ${st.detail}</span>`
      : '';

    const html =
      `<span style="color:${st.color};font-weight:bold;">${st.icon} ${st.label}</span>` +
      detailHtml +
      `<span style="color:#888;font-size:0.9em;margin-left:8px;">${dateStr} ${dayOfWeek} ${timeStr}</span>`;

    if (html !== lastHtml) {
      el.innerHTML = html;
      lastHtml = html;
    }

    // 对齐到下一整分钟
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 20;
    clearTimeout(timer);
    timer = setTimeout(render, msToNextMinute);
  }

  // ========== 公开接口 ==========
  return {
    mount(target) {
      el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) {
        console.error('[PeakTimeDisplay] 目标元素不存在');
        return this;
      }
      render();
      loadHolidayData().then(() => render());
      return this;
    },

    render,

    destroy() {
      clearTimeout(timer);
      timer = null;
      el = null;
      lastHtml = '';
    },

    getStatus() {
      const now = new Date();
      const st = getStatus(now);
      return {
        type: st.type,
        label: st.label,
        detail: st.detail,
        isPeak: st.type === 'peak',
        isFullFree: st.type === 'full-free',
        date: formatDate(now),
        time: formatTime(now),
        dayOfWeek: now.getDay(),
      };
    },
  };
})();