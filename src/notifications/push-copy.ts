// What a notification of new books says, in the app's languages. {title} is
// the book's title in the reader's language, {creator} who wrote it, {count}
// how many books there are.
//
// one:     a new book
// free:    a new story that is the free one (for readers without a subscription)
// creator: a new book from a creator the reader follows or reads most
// many:    several books at once ({title} is the first)

type Copy = {
  one_title: string;
  one_body: string;
  free_title: string;
  free_body: string;
  creator_title: string;
  creator_body: string;
  many_title: string;
  many_body: string;
};

export const PUSH_COPY: Record<string, Copy> = {
  en: {
    one_title: 'A new book is here 🌙',
    one_body: '“{title}” is ready for tonight’s bedtime story.',
    free_title: 'Tonight’s free story 🎁',
    free_body: '“{title}” is free to read now. Time to snuggle up!',
    creator_title: 'New from {creator} ⭐',
    creator_body: '“{title}” just arrived. Be the first to read it tonight!',
    many_title: '{count} new books tonight 📚',
    many_body: '“{title}” and more are waiting on the shelf.',
  },
  ig: {
    one_title: 'Akwụkwọ ọhụrụ abịala 🌙',
    one_body: '“{title}” dị njikere maka akụkọ abalị taa.',
    free_title: 'Akụkọ efu nke abalị taa 🎁',
    free_body: 'Ị nwere ike ịgụ “{title}” n’efu ugbu a. Oge ịlakpu ụra eruola!',
    creator_title: 'Ọhụrụ sitere n’aka {creator} ⭐',
    creator_body: '“{title}” ka bịarutere. Bụrụ onye mbụ gụrụ ya n’abalị taa!',
    many_title: 'Akwụkwọ ọhụrụ {count} n’abalị taa 📚',
    many_body: '“{title}” na ndị ọzọ na-eche gị n’ebe a na-edowe akwụkwọ.',
  },
  zh: {
    one_title: '新书上架啦 🌙',
    one_body: '《{title}》已准备好，今晚睡前一起读吧。',
    free_title: '今晚的免费故事 🎁',
    free_body: '《{title}》现在可以免费阅读。快钻进被窝吧！',
    creator_title: '{creator} 的新作 ⭐',
    creator_body: '《{title}》刚刚上线。今晚抢先读吧！',
    many_title: '今晚有 {count} 本新书 📚',
    many_body: '《{title}》等新书正在书架上等你。',
  },
  hi: {
    one_title: 'नई किताब आ गई है 🌙',
    one_body: '“{title}” आज रात की सोने से पहले की कहानी के लिए तैयार है।',
    free_title: 'आज रात की मुफ़्त कहानी 🎁',
    free_body: '“{title}” अब मुफ़्त में पढ़ें। चलो, रज़ाई में घुस जाएँ!',
    creator_title: '{creator} की नई किताब ⭐',
    creator_body: '“{title}” अभी-अभी आई है। आज रात सबसे पहले पढ़ें!',
    many_title: 'आज रात {count} नई किताबें 📚',
    many_body: '“{title}” और कई किताबें शेल्फ़ पर इंतज़ार कर रही हैं।',
  },
  es: {
    one_title: '¡Ha llegado un libro nuevo! 🌙',
    one_body: '“{title}” está listo para el cuento de esta noche.',
    free_title: 'El cuento gratis de esta noche 🎁',
    free_body: '“{title}” ya se puede leer gratis. ¡A acurrucarse!',
    creator_title: 'Nuevo de {creator} ⭐',
    creator_body:
      '“{title}” acaba de llegar. ¡Sé el primero en leerlo esta noche!',
    many_title: '{count} libros nuevos esta noche 📚',
    many_body: '“{title}” y más te esperan en la estantería.',
  },
  fr: {
    one_title: 'Un nouveau livre est arrivé 🌙',
    one_body: '« {title} » est prêt pour l’histoire du soir.',
    free_title: 'L’histoire gratuite de ce soir 🎁',
    free_body: '« {title} » est gratuit dès maintenant. On se blottit !',
    creator_title: 'Nouveau de {creator} ⭐',
    creator_body:
      '« {title} » vient d’arriver. Soyez les premiers à le lire ce soir !',
    many_title: '{count} nouveaux livres ce soir 📚',
    many_body: '« {title} » et d’autres vous attendent sur l’étagère.',
  },
  ar: {
    one_title: 'وصل كتاب جديد 🌙',
    one_body: '«{title}» جاهز لقصة ما قبل النوم الليلة.',
    free_title: 'قصة الليلة المجانية 🎁',
    free_body: 'يمكنك قراءة «{title}» مجانًا الآن. هيا إلى الفراش!',
    creator_title: 'جديد من {creator} ⭐',
    creator_body: 'وصل «{title}» للتو. كن أول من يقرؤه الليلة!',
    many_title: 'كتب جديدة الليلة: {count} 📚',
    many_body: '«{title}» وكتب أخرى بانتظارك على الرف.',
  },
  bn: {
    one_title: 'নতুন বই এসেছে 🌙',
    one_body: '“{title}” আজ রাতের ঘুমের গল্পের জন্য তৈরি।',
    free_title: 'আজ রাতের বিনামূল্যের গল্প 🎁',
    free_body: '“{title}” এখন বিনামূল্যে পড়া যাবে। চলো কম্বলের নিচে!',
    creator_title: '{creator}-এর নতুন বই ⭐',
    creator_body: '“{title}” এইমাত্র এসেছে। আজ রাতে সবার আগে পড়ো!',
    many_title: 'আজ রাতে {count}টি নতুন বই 📚',
    many_body: '“{title}” এবং আরও বই তাকে অপেক্ষা করছে।',
  },
  pt: {
    one_title: 'Chegou um livro novo 🌙',
    one_body: '“{title}” está pronto para a história de hoje à noite.',
    free_title: 'A história grátis desta noite 🎁',
    free_body: '“{title}” já pode ser lido de graça. Hora de se aconchegar!',
    creator_title: 'Novidade de {creator} ⭐',
    creator_body:
      '“{title}” acabou de chegar. Seja o primeiro a ler hoje à noite!',
    many_title: '{count} livros novos hoje à noite 📚',
    many_body: '“{title}” e mais estão esperando na estante.',
  },
  ru: {
    one_title: 'Новая книга уже здесь 🌙',
    one_body: '«{title}» ждёт вас к сказке на ночь.',
    free_title: 'Бесплатная сказка на сегодня 🎁',
    free_body: '«{title}» можно читать бесплатно. Пора укладываться!',
    creator_title: 'Новинка от {creator} ⭐',
    creator_body:
      '«{title}» только что вышла. Прочитайте первыми сегодня вечером!',
    many_title: 'Новые книги сегодня: {count} 📚',
    many_body: '«{title}» и другие ждут на полке.',
  },
  ur: {
    one_title: 'نئی کتاب آ گئی ہے 🌙',
    one_body: '«{title}» آج رات سونے سے پہلے کی کہانی کے لیے تیار ہے۔',
    free_title: 'آج رات کی مفت کہانی 🎁',
    free_body: '«{title}» اب مفت پڑھیں۔ چلو، بستر میں چلیں!',
    creator_title: '{creator} کی نئی کتاب ⭐',
    creator_body: '«{title}» ابھی ابھی آئی ہے۔ آج رات سب سے پہلے پڑھیں!',
    many_title: 'آج رات نئی کتابیں: {count} 📚',
    many_body: '«{title}» اور مزید کتابیں شیلف پر انتظار کر رہی ہیں۔',
  },
  sw: {
    one_title: 'Kitabu kipya kimefika 🌙',
    one_body: '“{title}” iko tayari kwa hadithi ya usiku wa leo.',
    free_title: 'Hadithi ya bure ya usiku wa leo 🎁',
    free_body: '“{title}” sasa inasomwa bure. Ni wakati wa kujifunika!',
    creator_title: 'Mpya kutoka kwa {creator} ⭐',
    creator_body:
      '“{title}” imefika sasa hivi. Kuwa wa kwanza kuisoma usiku wa leo!',
    many_title: 'Vitabu vipya {count} usiku wa leo 📚',
    many_body: '“{title}” na vingine vinasubiri kwenye rafu.',
  },
  ha: {
    one_title: 'Sabon littafi ya iso 🌙',
    one_body: '“{title}” ya shirya don labarin barcin daren yau.',
    free_title: 'Labarin kyauta na daren yau 🎁',
    free_body:
      'Ana iya karanta “{title}” kyauta yanzu. Lokacin kwanciya ya yi!',
    creator_title: 'Sabo daga {creator} ⭐',
    creator_body:
      '“{title}” ya iso yanzu. Ka zama na farko da zai karanta shi a daren yau!',
    many_title: 'Sababbin littattafai {count} a daren yau 📚',
    many_body: '“{title}” da wasu suna jiran ka a kan shiryayye.',
  },
  yo: {
    one_title: 'Ìwé tuntun ti dé 🌙',
    one_body: '“{title}” ti ṣetán fún ìtàn alẹ́ òní.',
    free_title: 'Ìtàn ọ̀fẹ́ ti alẹ́ òní 🎁',
    free_body: 'O lè ka “{title}” lọ́fẹ̀ẹ́ báyìí. Àkókò láti sùn ti tó!',
    creator_title: 'Tuntun láti ọ̀dọ̀ {creator} ⭐',
    creator_body: '“{title}” ṣẹ̀ṣẹ̀ dé. Jẹ́ ẹni àkọ́kọ́ tí yóò kà á lálẹ́ òní!',
    many_title: 'Ìwé tuntun {count} lálẹ́ òní 📚',
    many_body: '“{title}” àti àwọn míràn ń dúró dè ọ́ lórí pẹpẹ.',
  },
  de: {
    one_title: 'Ein neues Buch ist da 🌙',
    one_body: '„{title}“ ist bereit für die Gutenachtgeschichte.',
    free_title: 'Die Gratis-Geschichte für heute Abend 🎁',
    free_body: '„{title}“ ist jetzt kostenlos. Zeit zum Kuscheln!',
    creator_title: 'Neu von {creator} ⭐',
    creator_body:
      '„{title}“ ist gerade erschienen. Lies es heute Abend als Erster!',
    many_title: '{count} neue Bücher heute Abend 📚',
    many_body: '„{title}“ und mehr warten im Regal.',
  },
  it: {
    one_title: 'È arrivato un libro nuovo 🌙',
    one_body: '“{title}” è pronto per la favola di stasera.',
    free_title: 'La storia gratis di stasera 🎁',
    free_body: '“{title}” ora si legge gratis. Tutti sotto le coperte!',
    creator_title: 'Novità da {creator} ⭐',
    creator_body: '“{title}” è appena arrivato. Leggilo per primo stasera!',
    many_title: '{count} libri nuovi stasera 📚',
    many_body: '“{title}” e altri ti aspettano sullo scaffale.',
  },
  ja: {
    one_title: '新しい本が届きました 🌙',
    one_body: '「{title}」で今夜のおやすみ前の読み聞かせを。',
    free_title: '今夜の無料のおはなし 🎁',
    free_body: '「{title}」が今なら無料で読めます。お布団に入ろう！',
    creator_title: '{creator}さんの新作 ⭐',
    creator_body: '「{title}」が登場しました。今夜いちばんに読んでみよう！',
    many_title: '今夜は新しい本が{count}冊 📚',
    many_body: '「{title}」などが本棚で待っています。',
  },
  ko: {
    one_title: '새 책이 도착했어요 🌙',
    one_body: '‘{title}’ 오늘 밤 잠자리 동화로 준비됐어요.',
    free_title: '오늘 밤 무료 동화 🎁',
    free_body: '지금 ‘{title}’ 무료로 읽을 수 있어요. 이불 속으로 쏙!',
    creator_title: '{creator}의 신작 ⭐',
    creator_body: '‘{title}’ 방금 나왔어요. 오늘 밤 가장 먼저 읽어 보세요!',
    many_title: '오늘 밤 새 책 {count}권 📚',
    many_body: '‘{title}’ 외 여러 책이 책장에서 기다려요.',
  },
  tr: {
    one_title: 'Yeni bir kitap geldi 🌙',
    one_body: '“{title}” bu geceki uyku masalı için hazır.',
    free_title: 'Bu gecenin ücretsiz masalı 🎁',
    free_body: '“{title}” şimdi ücretsiz okunabilir. Haydi yatağa!',
    creator_title: '{creator} imzalı yeni kitap ⭐',
    creator_body: '“{title}” yeni çıktı. Bu gece ilk okuyan sen ol!',
    many_title: 'Bu gece {count} yeni kitap 📚',
    many_body: '“{title}” ve daha fazlası rafta seni bekliyor.',
  },
  id: {
    one_title: 'Ada buku baru 🌙',
    one_body: '“{title}” siap untuk dongeng malam ini.',
    free_title: 'Cerita gratis malam ini 🎁',
    free_body: '“{title}” bisa dibaca gratis sekarang. Ayo bersiap tidur!',
    creator_title: 'Baru dari {creator} ⭐',
    creator_body:
      '“{title}” baru saja hadir. Jadilah yang pertama membacanya malam ini!',
    many_title: '{count} buku baru malam ini 📚',
    many_body: '“{title}” dan lainnya menunggu di rak.',
  },
  vi: {
    one_title: 'Có sách mới rồi 🌙',
    one_body: '“{title}” đã sẵn sàng cho chuyện kể tối nay.',
    free_title: 'Truyện miễn phí tối nay 🎁',
    free_body: '“{title}” giờ đã đọc miễn phí. Cùng lên giường nào!',
    creator_title: 'Mới từ {creator} ⭐',
    creator_body: '“{title}” vừa ra mắt. Hãy là người đầu tiên đọc tối nay!',
    many_title: '{count} cuốn sách mới tối nay 📚',
    many_body: '“{title}” và nhiều sách khác đang chờ trên kệ.',
  },
  nl: {
    one_title: 'Er is een nieuw boek 🌙',
    one_body: '‘{title}’ staat klaar voor het verhaaltje van vanavond.',
    free_title: 'Het gratis verhaal van vanavond 🎁',
    free_body: '‘{title}’ is nu gratis te lezen. Tijd om te knuffelen!',
    creator_title: 'Nieuw van {creator} ⭐',
    creator_body: '‘{title}’ is net verschenen. Lees het vanavond als eerste!',
    many_title: '{count} nieuwe boeken vanavond 📚',
    many_body: '‘{title}’ en meer wachten op de plank.',
  },
  pl: {
    one_title: 'Jest nowa książka 🌙',
    one_body: '„{title}” czeka na dzisiejszą bajkę na dobranoc.',
    free_title: 'Darmowa bajka na dziś 🎁',
    free_body: '„{title}” można teraz czytać za darmo. Czas się przytulić!',
    creator_title: 'Nowość od {creator} ⭐',
    creator_body:
      '„{title}” właśnie się pojawiła. Przeczytaj ją dziś pierwszy!',
    many_title: 'Nowe książki na dziś: {count} 📚',
    many_body: '„{title}” i inne czekają na półce.',
  },
  fa: {
    one_title: 'کتاب تازه رسید 🌙',
    one_body: '«{title}» برای قصهٔ شب امشب آماده است.',
    free_title: 'قصهٔ رایگان امشب 🎁',
    free_body: '«{title}» اکنون رایگان است. وقت رفتن زیر پتو!',
    creator_title: 'تازه از {creator} ⭐',
    creator_body:
      '«{title}» همین الان رسید. امشب اولین نفری باش که آن را می‌خواند!',
    many_title: 'امشب {count} کتاب تازه 📚',
    many_body: '«{title}» و کتاب‌های دیگر در قفسه منتظرند.',
  },
};

export type CopyKind = 'one' | 'free' | 'creator' | 'many';

/** A notification's title and body in `language` (English where it has none). */
export function writeNews(
  language: string,
  kind: CopyKind,
  fill: { title: string; creator?: string; count?: number },
) {
  const copy = PUSH_COPY[language] ?? PUSH_COPY.en;
  const put = (text: string) =>
    text
      .replace('{title}', fill.title)
      .replace('{creator}', fill.creator ?? '')
      .replace('{count}', String(fill.count ?? ''));
  return {
    title: put(copy[`${kind}_title`]),
    body: put(copy[`${kind}_body`]),
  };
}
