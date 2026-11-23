export const CHAPTER_ORDER = [
  'GATE',
  'FRANKINCENSE',
  'DHOW',
  'POTTERY',
  'HALWA',
  'COFFEE',
  'FINALE',
];
export const COLLECTIBLE_CHAPTERS = [
  'FRANKINCENSE',
  'DHOW',
  'POTTERY',
  'HALWA',
  'COFFEE',
];

export const INTERACTION_LAYOUT = {
  frankincense: {
    resin: [-0.25, 0.32, 0.15],
    bowl: { center: [0, 0.47, 0], radius: 0.115, below: 0.035, above: 0.13 },
  },
  dhow: { pullDistance: 0.48, maxStep: 0.12 },
  pottery: {
    wheel: { center: [0, 0.18, 0.18], radius: 0.15, below: 0.025, above: 0.15 },
    targetHeight: [0.27, 0.33],
    targetWidth: [0.83, 1.12],
  },
  halwa: {
    cauldron: { center: [0, 0.22, 0], radius: 0.17, below: 0.03, above: 0.17 },
    fan: { center: [0, 0.12, 0.24], halfSize: [0.3, 0.2, 0.22] },
    turns: 3,
    strokes: 6,
  },
  // Perfect Pour: fill is measured from real aligned flow, then judged on stop.
  coffee: {
    cup: { center: [0.25, 0.1, 0.08], radius: 0.05, below: 0, above: 0.2 },
    minAngle: 0.6,
    maxAngle: 1.6,
    pourDuration: 2.8,
    fillRate: 0.2,
    perfectMin: 0.6,
    perfectMax: 0.8,
    overflowLevel: 1,
    settleSeconds: 0.5,
    resetSeconds: 1,
  },
  finale: { countdown: 10 },
};

export const CHAPTER_TEXT = {
  GATE: {
    title: 'بوابة الحكاية',
    subtitle: 'ثلاثة قوالب للنقش على الباب',
    narration:
      'أهلاً بك في لمسة عُمان. هنا تبدأ رحلتك عبر ملامح تراثنا العريق. بلمستك، تنبض الحكايات من جديد.',
  },
  FRANKINCENSE: {
    title: 'عبق ظفار',
    subtitle: 'اللبان العُماني',
    narration:
      'من أرض ظفار، انتشر اللبان العُماني إلى أنحاء العالم، حاملاً عبق التاريخ وأصالة المكان.',
  },
  DHOW: {
    title: 'أشرعة عُمان',
    subtitle: 'إرث البحّارة',
    narration:
      'عبر البحار والمحيطات، أبحر العُمانيون بسفنهم، حاملين التجارة والمعرفة ورسائل السلام.',
  },
  POTTERY: {
    title: 'من الطين حكاية',
    subtitle: 'قلعة نزوى وصناعة الفخار',
    narration:
      'في قلاع عُمان وحرفها التقليدية، تتجسد مهارة الأجداد. ومن الطين، تتشكل قطع فنية تحفظ ذاكرة المكان.',
  },
  HALWA: {
    title: 'حلاوة اللقاء',
    subtitle: 'الحلوى العُمانية',
    narration:
      'الحلوى العُمانية رمز من رموز الضيافة والاحتفاء. بمذاقها المميز، تجتمع العائلة وتُروى الحكايات.',
  },
  COFFEE: {
    title: 'فنجان كرم',
    subtitle: 'الضيافة العُمانية',
    narration:
      'بالقهوة والحلوى نستقبل ضيوفنا، فكرم الضيافة من أجمل ما يميز المجتمع العُماني.',
  },
  FINALE: {
    title: 'كل عام وعُمان بخير 🇴🇲',
    subtitle: 'خمس لمسات… حكاية واحدة',
    narration: 'شكراً لمشاركتك في لمسة عُمان.',
  },
};
