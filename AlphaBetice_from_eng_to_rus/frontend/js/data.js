// ALFABETICA · FROM ENGLISH TO RUSSIAN · STARTER (Ю.О. Чумакова et al.)
window.BOOK = (() => {
  const direction = 'en-ru';
  // Book header: Aа[a] Oо[o] Ээ[e] Ыы[ɪ:] Ии[ɪ] Уу[u]
  // `key` stays A O E Y I U so the chant recording still lines up.
  const VOWEL = [
    { key: 'A', pair: 'Aа', sound: 'a', ipa: 'a:', cyr: 'А', say: 'а', note: 523 },
    { key: 'O', pair: 'Oо', sound: 'o', ipa: 'o', cyr: 'О', say: 'о', note: 587 },
    { key: 'E', pair: 'Ээ', sound: 'e', ipa: 'e', cyr: 'Э', say: 'э', note: 622 },
    { key: 'Y', pair: 'Ыы', sound: 'ɪ:', ipa: 'ɪ:', cyr: 'Ы', say: 'ы', note: 659 },
    { key: 'I', pair: 'Ии', sound: 'ɪ', ipa: 'ɪ', cyr: 'И', say: 'и', note: 698 },
    { key: 'U', pair: 'Уу', sound: 'u', ipa: 'u', cyr: 'У', say: 'у', note: 784 },
  ];
  const SYL_AUDIO = {
    NA: 'assets/audio/l2/syl-na.m4a', NO: 'assets/audio/l2/syl-no.m4a', NE: 'assets/audio/l2/syl-ne.m4a',
    NY: 'assets/audio/l2/syl-ny.m4a', NI: 'assets/audio/l2/syl-ni.m4a', NU: 'assets/audio/l2/syl-nu.m4a',
    TA: 'assets/audio/syl/ta.m4a', TO: 'assets/audio/syl/to.m4a', TE: 'assets/audio/syl/te.m4a',
    TI: 'assets/audio/syl/ti.m4a', TY: 'assets/audio/l3/ty.m4a?v=3', TU: 'assets/audio/syl/tu.m4a',
    KA: 'assets/audio/syl/ka.m4a', KO: 'assets/audio/syl/ko.m4a',
    KI: 'assets/audio/syl/ki.m4a', KU: 'assets/audio/syl/ku.m4a',
    SA: 'assets/audio/syl/sa.m4a', SO: 'assets/audio/syl/so.m4a', SE: 'assets/audio/syl/se.m4a',
    SI: 'assets/audio/syl/si.m4a', SU: 'assets/audio/syl/su.m4a',
  };
  const syl = (en, ru, tip) => VOWEL.map((v) => ({
    ru: ru + v.cyr, en: en + v.key, pair: v.pair, sound: tip + v.ipa, say: 'ru',
    audio: SYL_AUDIO[en + v.key] || null,
  }));
  const sylN = syl('N', 'Н', 'n');
  const sylT = syl('T', 'Т', 't');
  const sylK = syl('K', 'К', 'k');
  const sylS = syl('S', 'С', 's');
  const WORD_AUDIO = {
    Anna: 'assets/audio/l2/anna.m4a?v=2',
    Nina: 'assets/audio/l2/nina.m4a?v=2',
    Inna: 'assets/audio/l2/inna.m4a?v=2',
    Nonna: 'assets/audio/l2/nonna.m4a?v=2',
    And: 'assets/audio/l2/i.m4a',
    But: 'assets/audio/l2/no.m4a',
    On: 'assets/audio/l2/na.m4a',
    'Take! (as an order)': 'assets/audio/l2/na.m4a',
    'Have/has': 'assets/audio/l2/u.m4a',
    He: 'assets/audio/l2/on.m4a',
    She: 'assets/audio/l2/ona.m4a',
    It: 'assets/audio/l2/ono.m4a',
    They: 'assets/audio/l2/oni.m4a',
    Nata: 'assets/audio/words/nata.m4a',
    Anton: 'assets/audio/words/anton.m4a',
    'Here is/ are': 'assets/audio/l3/tut.m4a?v=3',
    'You (singular form)': 'assets/audio/l3/ty.m4a?v=3',
  };
  const w = (en, cyr, ru, name = false) => ({ en, cyr, ru, name, audio: WORD_AUDIO[en] || null });

  const VOWEL_AUDIO = {
    A: 'assets/audio/vowels/a.m4a',
    O: 'assets/audio/vowels/o.m4a',
    E: 'assets/audio/vowels/e.m4a',
    I: 'assets/audio/vowels/i.m4a',
    U: 'assets/audio/vowels/u.m4a',
  };
  const chantVowels = VOWEL.map((v) => ({
    en: v.key, pair: v.pair, sound: v.sound, ru: v.say, note: v.note,
    audio: VOWEL_AUDIO[v.key] || null,
  }));

  const lessons = [
    {
      id: 1,
      section: 'Lesson 1',
      title: "Let's meet! The Russian vowels!",
      letters: VOWEL.map((v) => ({ en: v.key, ru: v.cyr, sound: v.sound, pair: v.pair })),
      badge: 'AOЭЫIU',
      image: 'story1',
      story: [
        {
          image: 'story1',
          audioClips: ['assets/audio/l1/dialogue-1.m4a'],
          dialogue: [
            { who: 'A', say: 'We are crucial (synonym important) letters!', note: 'Aa [a:] says' },
            { who: 'O', say: 'What are you talking about?', note: 'Oo [o] asks' },
            { who: 'A', say: 'No WHAT but WHY!', note: 'Aa [a:] says' },
            { who: 'A', say: 'We live everywhere in different alphabets around the world! We can connect different languages as friends! Look at the map and you will see!', note: 'Aa [a:] says' },
          ],
        },
        {
          image: 'story2',
          audioClips: ['assets/audio/l1/dialogue-2.m4a', 'assets/audio/l1/dialogue-2b.m4a'],
          dialogue: [
            { who: 'O', say: 'WOW! I see! A lot of alphabets look like the same! In the UK, the USA, Germany, Italy, Brazil.', note: 'Oo [o] cries' },
            { who: 'A', say: 'Not only here. The basic of these alphabets is Latin (Roman) letters. That\'s way they are so like as brothers and sisters.', note: 'Aa [a:] says' },
            { who: 'O', say: 'But what is about the Russian language? Its letters are different from Latin (Roman) letters.', note: 'Oo [o] asks' },
            { who: 'A', say: 'Yes, you\'re right. The Russian alphabet is Cyrillic letters. They live in Russia, Belarus, Bulgaria, Ukraine, Macedonia and Mongolia. Latin letters and Cyrillic letters have one family tree, but they live in different branches.', note: 'Aa [a:] says' },
            { who: 'O', say: 'And we — Oo and Aa — live everywhere.', note: 'Oo [o] says' },
            { who: 'A', say: 'Yes! Let\'s make a letter team and help people, who can read using Latin letters, to study Cyrillic letters and teach them to read in the Russian language. Look!', note: 'Aa [a:] says' },
          ],
        },
      ],
      album: [
        { en: 'Aа', ru: 'Аа', note: '[a] — park · парк' },
        { en: 'Oо', ru: 'Оо', note: '[o] — sport · спорт' },
        { en: 'Ээ', ru: 'Ээ', note: '[e] — echo · эхо' },
        { en: 'Ыы', ru: 'Ыы', note: '[ɪ:] — cheese · сыр' },
        { en: 'Ии', ru: 'Ии', note: '[ɪ] — ficus · фикус' },
        { en: 'Уу', ru: 'Уу', note: '[u] — cuckoo · кукушка' },
      ],
      write: ['Aа  Oо  Ээ', 'Ыы  Ии  Уу', 'А О Э Ы И У'],
      vowelExamples: [
        { pair: 'А а', sound: 'a:', en: 'park', ru: 'парк', audio: 'assets/audio/l1/look-a.m4a' },
        { pair: 'О о', sound: 'o', en: 'sport', ru: 'спорт', audio: 'assets/audio/l1/look-o.m4a' },
        { pair: 'Э э', sound: 'e', en: 'echo', ru: 'эхо', audio: 'assets/audio/l1/look-e.m4a' },
        { pair: 'Ы ы', sound: 'ɪ:', en: 'cheese', ru: 'сыр', audio: 'assets/audio/l1/look-y.m4a' },
        { pair: 'И и', sound: 'ɪ', en: 'ficus', ru: 'фикус', audio: 'assets/audio/l1/look-i.m4a' },
        { pair: 'У у', sound: 'u', en: 'cuckoo', ru: 'кукушка', audio: 'assets/audio/l1/look-u.m4a' },
      ],
    },
    {
      id: 2,
      section: 'Lesson 2',
      title: 'The Russian letter [en] Н [н] sounds like English Nn [n]',
      letters: [{ en: 'N', ru: 'Н' }],
      hint: 'English Nn [n] sounds like Russian Н [н]',
      image: 'lesson2',
      syllables: sylN,
      words: [
        w('Anna', 'АННА', 'Анна [anna]', true), w('Nina', 'НИНА', 'Нина [nɪna]', true),
        w('Inna', 'ИННА', 'Инна [ɪnna]', true), w('Nonna', 'НОННА', 'Нонна', true),
        w('And', 'И', 'и [ɪ]'), w('But', 'НО', 'но'), w('On', 'НА', 'на [na]'),
        w('Take! (as an order)', 'НА', 'на'), w('Have/has', 'У', '[u]'),
        w('He', 'ОН', 'он [on]'), w('She', 'ОНА', 'она [ona]'),
        w('It', 'ОНО', 'оно [ono]'), w('They', 'ОНИ', 'они [onɪ]'),
      ],
      text: 'Anna, Анна, Nina, Нина, Inna, Инна, Nonna, Нонна. She is Nina. Она Нина. She is Anna. Она Анна. She is Inna. Она Инна. They are Nonna and Anna. Они Нонна и Анна. He and she. Он и она. Anna, take a banana. На, Анна, a banana. Inna, take a lemon. На, Инна, a lemon. Anna has a banana. У Анны a banana. Inna has a lemon. У Инны a lemon. А у Нины a lemon? Does Nina have a lemon?',
      textAudio: 'assets/audio/l2/text.m4a',
      readFive: 'Анна, Нина, Инна, Нонна. Она Нина. Она Анна. Она Инна. Они Нонна и Анна. Он и она.',
      readFiveAudio: 'assets/audio/l2/read5.m4a',
      crossword: {
        rows: [
          ' ОНО  ',
          '  О  Н',
          '  НИНА',
          '  Н   ',
          'ОНА   ',
          'Н     ',
          'ИННА  ',
          '   Н  ',
          '  ОН  ',
          '   А  ',
        ],
        clues: [
          { n: 1, dir: 'across', r: 4, c: 0, clue: 'She.', answer: 'ОНА' },
          { n: 2, dir: 'down', r: 4, c: 0, clue: 'They.', answer: 'ОНИ' },
          { n: 3, dir: 'down', r: 0, c: 2, clue: 'Nonna.', answer: 'НОННА' },
          { n: 4, dir: 'across', r: 0, c: 1, clue: 'It.', answer: 'ОНО' },
          { n: 5, dir: 'across', r: 2, c: 2, clue: 'Nina.', answer: 'НИНА' },
          { n: 6, dir: 'down', r: 1, c: 5, clue: 'Take!', answer: 'НА' },
          { n: 7, dir: 'across', r: 6, c: 0, clue: 'Inna.', answer: 'ИННА' },
          { n: 8, dir: 'down', r: 6, c: 3, clue: 'Anna.', answer: 'АННА' },
          { n: 9, dir: 'across', r: 8, c: 2, clue: 'He.', answer: 'ОН' },
        ],
      },
      grid: {
        rows: ['НАННА', 'ОНАОН', 'НИНАО', 'НОНАН', 'АОНИО'],
        words: ['АННА', 'НИНА', 'НОННА', 'ОНА', 'ОНИ', 'ОН', 'ОНО', 'НА', 'НО'],
      },
      remember: [
        ['ОН', 'HE'], ['ОНА', 'SHE'], ['ОНО', 'IT'], ['ОНИ', 'THEY'],
      ],
      rememberTitle: '9. Remember',
      pronouns: true,
      traces: [
        ['Анна, Нина, Инна, Нонна.', 'Она Нина.', 'Она Анна. Она Инна. Они Нонна и Анна.', 'Он и она. На, Анна, a banana. На, Инна, a lemon.', 'У Анны a banana. У Инны a lemon. А у Нины a lemon?'],
        ['Анна, Нина, Инна, Нонна. Она Анна.', 'Она Нина. Она Инна. Они Нонна и Анна. Он и она.', 'Анна, Нина, Инна, Нонна. Она Анна. Она Нина. Она Инна.', 'Они Нонна и Анна. Он и она.'],
        ['Анна, Нина, Инна, Нонна. Она Анна. Она Нина. Она Инна.', 'Они Нонна и Анна. Он и она.'],
      ],
      traceTitles: ['4. Trace words', '5. Trace words', '6. Write down into your copybook'],
    },
    {
      id: 3,
      section: 'Lesson 3',
      title: 'The Russian letter [te] Т [т] sounds like English Tt [t]',
      letters: [{ en: 'T', ru: 'Т' }],
      hint: 'English Tt [t] sounds like Russian Т [т]',
      image: 'lesson3',
      syllables: sylT,
      words: [
        w('Nata', 'НАТА', 'Ната [nata]', true), w('Anton', 'АНТОН', 'Антон [anton]', true),
        w('Here is/ are', 'ТУТ', 'тут [tut]'), w('You (singular form)', 'ТЫ', 'ты [tɪ:]'),
      ],
      text: 'Инна, Анна, Ната, Антон. Here is Inna. Тут Инна. Here is Anna. Тут Анна. Here is Nata. Тут Ната. Here is Anton. Тут Антон. He is here. Он тут. She is here. Она тут. They are here. Они тут. Does Nata have tomatoes? У Наты tomatoes? Are you Anton? Ты Антон? You are Anna. Ты Анна.',
      textAudio: 'assets/audio/l3/text.m4a',
      readFive: 'Инна, Анна, Ната, Антон. Тут Инна. Тут Анна. Тут Ната. Тут Антон. Он тут. Она тут. Они тут. Ты Антон? Ты Анна.',
      readFiveAudio: 'assets/audio/l3/read5.m4a?v=3',
      remember: [
        ['ОН', 'HE'], ['ОНА', 'SHE'], ['ОНО', 'IT'], ['ОНИ', 'THEY'], ['ТЫ', 'YOU'],
      ],
      rememberTitle: '8. Remember',
      traces: [
        ['Тут Инна, Анна, Нонна,', 'Ната, Нанна. Инна тут?', 'А ты тут?', 'Инна тут!', 'Инна, Анна, Ната, Антон. Тут Инна. Тут Анна. Тут Ната. Тут Антон.', 'Он тут. А она тут? Она тут. Они тут. У Наты tomatoes?', 'Ты Антон? Ты Анна.'],
        ['Инна, Анна, Ната, Антон. Тут Инна. Тут Анна. Тут Ната. Тут Антон.', 'Он тут. Она тут. Они тут. Ты Антон? Ты Анна.', 'Инна, Анна, Ната, Антон. Тут Инна. Тут Анна. Тут Ната.', 'Тут Антон. Он тут. Она тут. Они тут. Ты Антон? Ты Анна.'],
        ['Инна, Анна, Ната, Антон. Тут Инна. Тут Анна. Тут Ната.', 'Тут Антон. Он тут. Она тут. Они тут. Ты Антон? Ты Анна.'],
      ],
      traceTitles: ['4. Trace words', '5. Trace words', '6. Write down into your copybook'],
    },
    {
      id: 4,
      section: 'Lesson 4',
      title: 'The Russian letter [ka] К [к] sounds like English Kk [k]',
      letters: [{ en: 'K', ru: 'К' }],
      hint: 'English Kk [k] sounds like Russian К [к]',
      image: 'lesson4',
      syllables: sylK,
      words: [
        w('Who?', 'КТО?', 'Кто? [kto]'), w('How?', 'КАК?', 'Как?'),
        w('Cat', 'КОТ', 'кот [kot]'), w('Cats', 'КОТЫ', 'коты [kotɪ:]'),
        w('Duck', 'УТКА', 'утка'), w('Ducks', 'УТКИ', 'утки'),
        w('Horses', 'КОНИ', 'кони'),
        w('Nikita', 'НИКИТА', 'Никита', true), w('Nika', 'НИКА', 'Ника', true),
      ],
      text: 'Who are you? Ты кто? Ника. How are you? Как ты? Okay. Ок. And who are you? А ты кто? Никита. Nikita has a cat. У Никиты кот. Nikita and the cat are here. Тут Никита и кот. Does Nika have a duck? У Ники утка? Nika\'s duck is here. Тут Никина утка. Nikita\'s cat is here. Тут кот Никиты. Тут Никита, тут и кот. Anna has ducks and horses. У Анны утки и кони. Nikita, take a cat. На, Никита, кота. Nika, take a duck. На, Ника, утку.',
      more: [
        'Он кто? Кто он? Он Антон.',
        'Он кто? Кто он? Он Никита.',
        'Она кто? Кто она? Она Нина.',
        'Она кто? Кто она? Она Анна.',
        'Они кто? Кто они? Антон и Анна.',
        'Они кто? Кто они? Никита и Нина.',
        'Ты кто? Кто ты?',
      ],
      readFive: 'Ты кто? Ника. Как ты? Ок. А ты кто? Никита. У Никиты кот. Тут Никита и кот. У Ники утка? Тут Никина утка. Тут кот Никиты. Тут Никита, тут и кот. У Анны утки и кони. На, Никита, кота. На, Ника, утку.',
      extraImage: { name: 'lesson4', caption: 'На, кота! Тут он, тут и кот.' },
      remember: [
        ['КТО?', 'Who?'], ['КАК?', 'How?'],
      ],
      rememberTitle: '8. Remember',
      signName: true,
      traces: [
        ['Ты кто? Ника. Как ты? Ок. А ты кто? Никита.', 'У Никиты кот. Тут Никита и кот. У Ники утка?', 'Тут Никина утка. Тут Никитин кот.', 'Тут Никита, тут и кот. У Анны утки и кони.', 'На, Никита, кота. На, Ника, утку.'],
        ['Ты кто? Ника. Как ты? Ок. А ты кто? Никита. У Никиты кот.', 'Тут Никита и кот. У Ники утка? Тут Никина утка.', 'Тут Никитин кот. Тут Никита, тут и кот.', 'У Анны утки и кони. На, Никита, кота. На, Ника, утку.'],
        ['Ты кто? Ника. Как ты? Ок. А ты кто? Никита. У Никиты кот.', 'Тут Никита и кот. У Ники утка? Тут Никина утка. Тут кот Никиты.', 'Тут Никита, тут и кот. У Анны утки и кони. На, Никита, кота. На, Ника, утку.'],
      ],
      traceTitles: ['4. Trace words', '5. Trace words', '6. Write down into your copybook'],
    },
    {
      id: 5,
      section: 'Lesson 5',
      title: 'The Russian letter [es] Сс [s] sounds like English Ss [s]',
      letters: [{ en: 'S', ru: 'С' }],
      hint: 'English Ss [s] sounds like Russian С [с]',
      image: 'lesson5',
      syllables: sylS,
      words: [
        w('Juice', 'СОК', 'сок [sok]'), w('Wasp', 'ОСА', 'оса [osa]'),
        w('Bush (one)', 'КУСТ', 'куст [kust]'), w('Bushes (many)', 'КУСТЫ', 'кусты [kustɪ:]'),
        w('Pine-tree (one)', 'СОСНА', 'сосна [sosna]'), w('Pine-trees (many)', 'СОСНЫ', 'сосны [sosnɪ:]'),
        w('Stands (he, she, it)', 'СТОИТ', 'стоит [stoɪt]'), w('Nose', 'НОС', 'нос [nos]'),
      ],
      text: 'Nina is here. Нина тут. Nina stands by the bush. Нина стоит у куста. Nina has got juice. У Нины сок. A wasp is on Nina\'s nose. На носу у Нины оса. Anton is here. Тут Антон. He stands by the pine-tree. Он стоит у сосны. Who are you? Ты кто? Анна. Anna, take juice. На, Анна, сок!',
      readFive: 'Тут Никита, тут и кот. У Анны утки и кони. На, Никита, кота. На, Ника, утку. Нина тут. Нина стоит у куста. У Нины сок. На носу у Нины оса. Тут Антон. Он стоит у сосны. Ты кто? Анна. На, Анна, сок.',
      rememberTitle: '9. Remember',
      more: [
        'Who? Кто? He! Он! Он Никита.',
        'He stands by the bush. PRESENT',
        'Он стоит у куста. PRESENT',
        'Who? Кто? She! Она! Она Инна.',
        'She stands by the bush. PRESENT',
        'Она стоит у куста. PRESENT',
        'It stands by the bush. PRESENT',
        'Оно стоит у куста.',
      ],
      traces: [
        ['НИНА ТУТ.', 'Нина стоит у куста. У Нины сок.', 'На носу у Нины оса. Тут Антон.', 'Он стоит у сосны. Ты кто? Анна. На, Анна, сок.'],
        ['Нина тут. Нина стоит у куста. У Нины сок. На носу у Нины оса.', 'Тут Антон. Он стоит у сосны. Ты кто? Анна. На, Анна, сок.'],
        ['Нина тут. Нина стоит у куста. У Нины сок. На носу у Нины оса.', 'Тут Антон. Он стоит у сосны. Ты кто? Анна. На, Анна, сок.'],
      ],
      traceTitles: ['4. Trace words', '5. Trace words', '6. Write down into your copybook'],
      remember: [
        ['Кто? Он! Он Никита.', 'Who? He!'],
        ['Кто? Она! Она Инна.', 'Who? She!'],
        ['Он стоит у куста.', 'He stands by the bush.'],
        ['Она стоит у куста.', 'She stands by the bush.'],
        ['Оно стоит у куста.', 'It stands by the bush.'],
      ],
      write: ['S s  С с', 'СА СО СЭ СЫ СИ СУ', 'Нина тут. У Нины сок.', 'На носу у Нины оса.'],
    },
  ];

  const glossary = {};
  for (const l of lessons) {
    for (const wd of l.words || []) {
      glossary[wd.en.toLowerCase()] = wd.cyr ? `${wd.cyr} — ${wd.ru}` : wd.ru;
      if (wd.cyr) glossary[wd.cyr.toLowerCase()] = wd.ru;
    }
    for (const ex of l.vowelExamples || []) {
      glossary[ex.en.toLowerCase()] = ex.ru;
      glossary[ex.ru.toLowerCase()] = ex.en;
    }
  }
  glossary.anna = 'АННА — Anna';
  glossary.nina = 'НИНА — Nina';
  glossary.inna = 'ИННА — Inna';
  glossary.nonna = 'НОННА — Nonna';

  // Book footer, every page. Vowels are red, consonants blue, Ъ and Ь are signs.
  // The printed line has Ёё and does not include Йй.
  const vowels = new Set(['А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я']);
  const signs = new Set(['Ъ', 'Ь']);
  const alphabet = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('').map((up) => [
    up,
    up.toLowerCase(),
    signs.has(up) ? 'sign' : vowels.has(up) ? 'v' : 'c',
  ]);

  const speak = {};
  for (const l of lessons) {
    for (const s of l.syllables || []) {
      if (s.audio && s.ru) speak[s.ru.toUpperCase()] = s.audio;
    }
    for (const wd of l.words || []) {
      if (!wd.audio || !wd.cyr) continue;
      const key = wd.cyr.toUpperCase().replace(/[^А-ЯЁ]/g, '');
      if (key) speak[key] = wd.audio;
    }
  }

  return {
    direction,
    chantVowels,
    chantAudio: 'assets/audio/l1/chant.m4a',
    lessons,
    readings: [],
    final: null,
    alphabet,
    glossary,
    speak,
  };
})();
