/**
 * EDIT ARABIC FEEDBACK HERE / عدّل رسائل التحديات المكتوبة هنا.
 * These messages are displayed visually; no automatic voiceover is played.
 */
export const CHALLENGE_MESSAGES = Object.freeze({
  incenseSuccess:
    'أحسنت! اشتعل اللبان، وتصاعد عبقه من المبخرة. لقد أتممت تحدّي إشعال البخور.',
  pourSuccess:
    'صبّة متقنة! وصل الفنجان إلى المستوى المناسب. هكذا تكتمل لمسة الكرم، وقد نجحت في تحدّي القهوة.',
  pourFail:
    'امتلأ الفنجان أكثر من اللازم. لا بأس، أفرغناه لتجرّب من جديد. أوقف الصب مبكراً عند المنطقة المضيئة.',
  challengeFail:
    'اقتربت من النجاح. أعد المحاولة بهدوء، واتبع الإشارة المضيئة؛ كل تجربة تزيد مهارتك.',
});

/** EDIT HIDDEN-OBJECT FACTS HERE / حقائق القطع المخفية. Verified UNESCO sources. */
export const TRIVIA_FACTS = Object.freeze([
  Object.freeze({
    id: 'frankincense',
    title: 'سرّ أرض اللبان',
    text: 'هل تعلم؟ تضم أرض اللبان في ظفار أربعة مواقع مدرجة على قائمة التراث العالمي لليونسكو، منها وادي دوكة. وتروي هذه المواقع تاريخ زراعة اللبان وتجارته عبر طرق القوافل والموانئ.',
    source: 'https://whc.unesco.org/en/list/1010/',
  }),
  Object.freeze({
    id: 'aflaj',
    title: 'حكمة الأفلاج',
    text: 'هل تعلم؟ تنقل الأفلاج العُمانية الماء بقوّة الجاذبية إلى المزارع والبيوت. وتعتمد إدارتها على تقاسم الماء والتعاون بين الأهالي، وقد أُدرجت خمسة أفلاج عُمانية على قائمة التراث العالمي لليونسكو.',
    source: 'https://whc.unesco.org/en/list/1207/',
  }),
  Object.freeze({
    id: 'khanjar',
    title: 'حكاية الخنجر',
    text: 'هل تعلم؟ الخنجر جزء من الزي التقليدي العُماني في المناسبات، وتنتقل مهارات صناعته وزخرفته بين الأجيال. وفي عام ألفين واثنين وعشرين، أدرجت اليونسكو هذه المهارات والممارسات الاجتماعية في قائمتها للتراث الثقافي غير المادي.',
    source:
      'https://ich.unesco.org/en/RL/al-khanjar-craft-skills-and-social-practices-01844',
  }),
]);
