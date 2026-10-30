(() => {
  const time = document.querySelector('#info-time');
  const date = document.querySelector('#info-date');
  const weather = document.querySelector('#info-weather');
  const timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const dateFormat = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short'
  });
  function tick() {
    const now = new Date();
    time.textContent = timeFormat.format(now);
    date.textContent = dateFormat.format(now);
    time.dateTime = date.dateTime = now.toISOString();
  }
  tick();
  setInterval(tick, 1000);

  // 保留旧网站的固定城市设置，不申请访客定位。
  const place = { name: '沈阳', latitude: 41.8057, longitude: 123.4315 };
  const weatherText = {
    0: '晴', 1: '晴间多云', 2: '多云', 3: '阴', 45: '有雾', 48: '雾凇',
    51: '小毛毛雨', 53: '毛毛雨', 55: '浓毛毛雨', 56: '冻毛毛雨', 57: '浓冻毛毛雨',
    61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
    71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒', 80: '阵雨', 81: '强阵雨',
    82: '暴雨', 85: '阵雪', 86: '强阵雪', 95: '雷阵雨', 96: '雷阵雨伴冰雹', 99: '强雷暴'
  };
  async function loadWeather() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const params = new URLSearchParams({
        latitude: place.latitude, longitude: place.longitude,
        current: 'temperature_2m,weather_code', timezone: 'Asia/Shanghai'
      });
      const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controller.signal });
      if (!response.ok) throw new Error('weather unavailable');
      const { current } = await response.json();
      if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) throw new Error('invalid weather');
      weather.textContent = place.name + ' · ' + (weatherText[current.weather_code] || '天气未知') + ' ' + Math.round(current.temperature_2m) + '°C';
      weather.title = '沿用原站城市：沈阳 · 天气数据：Open-Meteo · 每 30 分钟刷新';
    } catch {
      weather.textContent = place.name + ' · 天气暂不可用';
      weather.title = '联网后会重试获取天气；时钟照常显示';
    } finally {
      clearTimeout(timeout);
    }
  }
  loadWeather();
  setInterval(loadWeather, 30 * 60 * 1000);
  window.addEventListener('online', loadWeather);

  const copyQQ = document.querySelector('#copy-qq');
  copyQQ.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    const fallback = document.querySelector('#qq-fallback');
    try {
      await navigator.clipboard.writeText(copyQQ.dataset.qq);
      fallback.hidden = true;
      status.textContent = 'QQ 号已复制，可以去 QQ 找我。';
    } catch {
      fallback.hidden = false;
      status.textContent = '浏览器未允许自动复制，请复制下方号码。';
      const input = document.querySelector('#qq-number');
      input.focus();
      input.select();
    }
  });
})();
