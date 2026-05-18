type Locale = 'zh' | 'en';

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    title: '狂切',
    tagline: '点哪切哪。点越快，分越高。',
    tap_to_start: '点击开始',
    score: '得分',
    food: '食材',
    combo: '×{n}',
    best: '最高',
    again: '再来一次',
    home: '返回',
    leaderboard: '排行榜',
    new_best: '新纪录！',
    cuts_total: '总切片',
    final_score: '最终得分',
    max_combo: '最大连击',
  },
  en: {
    title: 'Endless Slice',
    tagline: 'Tap to chop. The faster you tap, the more it scores.',
    tap_to_start: 'Tap to start',
    score: 'Score',
    food: 'Food',
    combo: '×{n}',
    best: 'Best',
    again: 'Play again',
    home: 'Home',
    leaderboard: 'Leaderboard',
    new_best: 'New best!',
    cuts_total: 'Total cuts',
    final_score: 'Final score',
    max_combo: 'Max combo',
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
