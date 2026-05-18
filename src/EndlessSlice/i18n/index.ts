type Locale = 'zh' | 'en';

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    title: '无尽切切切',
    tagline: '节拍点准虚线，越准分越高',
    tap_to_start: '点击开始',
    score: '得分',
    combo: '连击 ×{n}',
    best: '最高',
    perfect: 'PERFECT',
    good: 'GOOD',
    ok: 'OK',
    miss: 'MISS',
    again: '再来一次',
    home: '返回',
    leaderboard: '排行榜',
    food_count: '已切食材',
    new_best: '新纪录！',
    drag_to_slice: '点击节拍切片',
    final_score: '最终得分',
  },
  en: {
    title: 'Endless Slice',
    tagline: 'Tap on the dashed marks. The closer, the better.',
    tap_to_start: 'Tap to start',
    score: 'Score',
    combo: 'Combo ×{n}',
    best: 'Best',
    perfect: 'PERFECT',
    good: 'GOOD',
    ok: 'OK',
    miss: 'MISS',
    again: 'Play again',
    home: 'Home',
    leaderboard: 'Leaderboard',
    food_count: 'Foods sliced',
    new_best: 'New best!',
    drag_to_slice: 'Tap on the beat to slice',
    final_score: 'Final score',
  },
};

function detectLocale(): Locale {
  const override = typeof localStorage !== 'undefined' ? localStorage.getItem('game_locale') : null;
  if (override === 'en' || override === 'zh') return override;
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const locale = detectLocale();

export function t(key: string, vars?: { n?: number | string }): string {
  const raw = dict[locale][key] ?? dict.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k as keyof typeof vars] ?? ''));
}
