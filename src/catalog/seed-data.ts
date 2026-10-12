// Mirrors CATEGORIES_DATA and Languages_DATA in bedtime-story/constants.ts.
// The app localizes category names through strings.ts and only knows the
// language codes in its `Lan` type, so keep these in sync with the app.
// Entries missing from the database are added on startup, in this order.

export const CATEGORY_SEED = [
  { name: 'Fantasy' },
  { name: 'Adventure' },
  { name: 'Educational' },
  { name: 'Fables' },
  { name: 'Humor' },
  { name: 'Diversity' },
  { name: 'STEM' },
];

export const LANGUAGE_SEED = [
  { name: 'English', isoCode: 'en' },
  { name: 'Igbo', isoCode: 'ig' },
  { name: 'Mandarin Chinese', isoCode: 'zh' },
  { name: 'Hindi', isoCode: 'hi' },
  { name: 'Spanish', isoCode: 'es' },
  { name: 'French', isoCode: 'fr' },
  { name: 'Modern Standard Arabic', isoCode: 'ar' },
  { name: 'Bengali', isoCode: 'bn' },
  { name: 'Portuguese', isoCode: 'pt' },
  { name: 'Russian', isoCode: 'ru' },
  { name: 'Urdu', isoCode: 'ur' },
  { name: 'Swahili', isoCode: 'sw' },
  { name: 'Hausa', isoCode: 'ha' },
  { name: 'Yoruba', isoCode: 'yo' },
  { name: 'German', isoCode: 'de' },
  { name: 'Italian', isoCode: 'it' },
  { name: 'Japanese', isoCode: 'ja' },
  { name: 'Korean', isoCode: 'ko' },
  { name: 'Turkish', isoCode: 'tr' },
  { name: 'Indonesian', isoCode: 'id' },
  { name: 'Vietnamese', isoCode: 'vi' },
  { name: 'Dutch', isoCode: 'nl' },
  { name: 'Polish', isoCode: 'pl' },
  { name: 'Persian', isoCode: 'fa' },
];
