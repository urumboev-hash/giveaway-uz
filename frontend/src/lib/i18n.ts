import type { Category } from "@/lib/types";

export type Lang = "ru" | "uz";

export const REGION_CODES = [
  "tashkent",
  "tashkent_obl",
  "andijan",
  "bukhara",
  "jizzakh",
  "kashkadarya",
  "navoi",
  "namangan",
  "samarkand",
  "surkhandarya",
  "syrdarya",
  "fergana",
  "khorezm",
  "karakalpakstan",
] as const;

export type RegionCode = (typeof REGION_CODES)[number] | "all";

export const REGION_LABELS: Record<RegionCode, { ru: string; uz: string }> = {
  all: { ru: "Весь Узбекистан", uz: "Butun Oʻzbekiston" },
  tashkent: { ru: "г. Ташкент", uz: "Toshkent shahri" },
  tashkent_obl: { ru: "Ташкентская обл.", uz: "Toshkent viloyati" },
  andijan: { ru: "Андижанская обл.", uz: "Andijon viloyati" },
  bukhara: { ru: "Бухарская обл.", uz: "Buxoro viloyati" },
  jizzakh: { ru: "Джизакская обл.", uz: "Jizzax viloyati" },
  kashkadarya: { ru: "Кашкадарьинская обл.", uz: "Qashqadaryo viloyati" },
  navoi: { ru: "Навоийская обл.", uz: "Navoiy viloyati" },
  namangan: { ru: "Наманганская обл.", uz: "Namangan viloyati" },
  samarkand: { ru: "Самаркандская обл.", uz: "Samarqand viloyati" },
  surkhandarya: { ru: "Сурхандарьинская обл.", uz: "Surxondaryo viloyati" },
  syrdarya: { ru: "Сырдарьинская обл.", uz: "Sirdaryo viloyati" },
  fergana: { ru: "Ферганская обл.", uz: "Fargʻona viloyati" },
  khorezm: { ru: "Хорезмская обл.", uz: "Xorazm viloyati" },
  karakalpakstan: { ru: "Каракалпакстан", uz: "Qoraqalpogʻiston" },
};

export const CATEGORY_LABELS: Record<Category, { ru: string; uz: string }> = {
  Техника: { ru: "Техника", uz: "Texnika" },
  Деньги: { ru: "Деньги", uz: "Pul" },
  Авто: { ru: "Авто", uz: "Avto" },
  "Еда и кафе": { ru: "Еда и кафе", uz: "Taom va kafe" },
  "Красота и одежда": { ru: "Красота и одежда", uz: "Kiyim va goʻzallik" },
  Другое: { ru: "Другое", uz: "Boshqa" },
};

export const DICT = {
  ru: {
    home: "/",
    submitHref: "/submit",
    siteTitle: "Халява в Instagram: розыгрыши, подарки и бесплатные акции Узбекистана",
    siteDescription:
      "Все бесплатные розыгрыши, гивы, подарки и бесплатные акции из Instagram по всему Узбекистану: Ташкент, Самарканд, Бухара, Фергана и другие области. Обновляется каждые 3 часа.",
    h1a: "Бесплатные розыгрыши и акции",
    h1b: "Узбекистан",
    lead: "Всё бесплатное из Instagram по всем областям в одном месте. Отмечайте условия и следите за своими участиями — без регистрации.",
    add: "+ Добавить",
    footer: "GiveUz — агрегатор бесплатных розыгрышей и акций из Instagram. Мы не являемся организатором конкурсов.",
    searchLabel: "Поиск по призу или аккаунту",
    searchPlaceholder: "iPhone, деньги, @brand…",
    all: "Все",
    mine: "⭐ Я участвую",
    region: "Область",
    allRegions: "Все области",
    emptyMine: "Вы ещё не отметили ни одного участия.",
    empty: "Ничего не найдено. Попробуйте другую область или запрос.",
    conditions: "Условия",
    starts: "Начало",
    ends: "До",
    endsUnknown: "Срок не указан",
    posted: "Опубликовано",
    soon: "Скоро",
    live: "Идёт сейчас",
    endsToday: "Последний день",
    fresh: "🆕 Новое",
    share: "Поделиться",
    copied: "Ссылка скопирована",
    sortNew: "Сначала новые",
    sortEnding: "Скоро заканчиваются",
    participate: "Участвовать в Instagram ↗",
    joined: "✓ Участвую",
    join: "Я участвую",
    giveaway: "Розыгрыш",
    at: "в",
    notifyOn: "🔔 Уведомлять о новых",
    notifyOff: "🔕 Уведомления включены",
    notifyRegion: "по области",
    notifyAll: "по всем областям",
    notifyDenied: "Уведомления запрещены в настройках браузера.",
    notifyUnsupported: "Этот браузер не поддерживает уведомления.",
    notifyIos: "На iPhone: нажмите «Поделиться» → «На экран Домой», откройте сайт с иконки и включите уведомления.",
    notifyDone: "Готово! Пришлём уведомление, когда появится новая халява.",
    notifyStopped: "Уведомления отключены.",
    notifyError: "Не получилось включить уведомления. Попробуйте ещё раз.",
    // форма
    submitTitle: "Добавить акцию",
    submitLead:
      "Блогер, бренд или просто нашли бесплатный розыгрыш или раздачу? Вставьте ссылку на пост — после модерации он появится в ленте.",
    fUrl: "Ссылка на пост *",
    fAccount: "Аккаунт организатора",
    fCategory: "Категория *",
    fRegion: "Область *",
    fPrize: "Что дают бесплатно? *",
    fPrizePh: "Например: iPhone 16 Pro и 3 сертификата по 500 000 сум",
    fSend: "Отправить на модерацию",
    fSending: "Отправляем…",
    fBadUrl: "Нужна ссылка на пост Instagram, например https://www.instagram.com/p/ABC123/",
    fShort: "Опишите приз хотя бы в нескольких словах.",
    fNoDb: "Сервис временно недоступен.",
    fDup: "Эта акция уже есть у нас — спасибо!",
    fFail: "Не удалось отправить:",
    fOk: "Спасибо! Акция отправлена на модерацию и скоро появится на сайте.",
  },
  uz: {
    home: "/uz",
    submitHref: "/uz/submit",
    siteTitle: "Instagramdagi bepul konkurslar, sovgʻalar va aksiyalar — butun Oʻzbekiston boʻylab",
    siteDescription:
      "Instagramdagi barcha bepul konkurslar, giveaway, sovgʻalar va tekin aksiyalar butun Oʻzbekiston boʻylab: Toshkent, Samarqand, Buxoro, Fargʻona va boshqa viloyatlar. Har 3 soatda yangilanadi.",
    h1a: "Bepul konkurslar va aksiyalar",
    h1b: "Oʻzbekiston",
    lead: "Instagramdagi barcha bepul konkurs va sovgʻalar — hamma viloyatlar boʻyicha bir joyda. Shartlarni belgilab boring va qatnashgan konkurslaringizni kuzating — roʻyxatdan oʻtmasdan.",
    add: "+ Qoʻshish",
    footer: "GiveUz — Instagramdagi bepul konkurs va aksiyalar jamlanmasi. Biz konkurslarni oʻtkazmaymiz.",
    searchLabel: "Sovgʻa yoki akkaunt boʻyicha qidirish",
    searchPlaceholder: "iPhone, pul, @brand…",
    all: "Hammasi",
    mine: "⭐ Qatnashganlarim",
    region: "Viloyat",
    allRegions: "Barcha viloyatlar",
    emptyMine: "Siz hali hech qaysi konkursni belgilamadingiz.",
    empty: "Hech narsa topilmadi. Boshqa viloyat yoki soʻzni sinab koʻring.",
    conditions: "Shartlar",
    starts: "Boshlanish vaqti",
    ends: "Tugash vaqti",
    endsUnknown: "Muddat koʻrsatilmagan",
    posted: "Eʼlon qilingan",
    soon: "Tez orada",
    live: "Davom etmoqda",
    endsToday: "Bugun oxirgi kun",
    fresh: "🆕 Yangi",
    share: "Ulashish",
    copied: "Havola nusxalandi",
    sortNew: "Eng yangilari",
    sortEnding: "Tugashiga oz qolganlar",
    participate: "Instagramda qatnashish ↗",
    joined: "✓ Qatnashdim",
    join: "Qatnashaman",
    giveaway: "Konkurs",
    at: "soat",
    notifyOn: "🔔 Yangi aksiyalardan xabardor boʻlish",
    notifyOff: "🔕 Xabarnomalar yoqilgan",
    notifyRegion: "viloyat",
    notifyAll: "barcha viloyatlar boʻyicha",
    notifyDenied: "Brauzer sozlamalarida xabarnomalar oʻchirilgan.",
    notifyUnsupported: "Bu brauzer xabarnomalarni qoʻllab-quvvatlamaydi.",
    notifyIos: "iPhoneʼda: «Ulashish» → «Bosh ekranga» tugmasini bosing, saytni ekrandagi belgidan oching va xabarnomalarni yoqing.",
    notifyDone: "Tayyor! Yangi bepul aksiya chiqishi bilan xabar beramiz.",
    notifyStopped: "Xabarnomalar oʻchirildi.",
    notifyError: "Xabarnomalarni yoqib boʻlmadi. Qaytadan urinib koʻring.",
    submitTitle: "Aksiya qoʻshish",
    submitLead:
      "Bloger, brend yoki shunchaki bepul konkurs yoki sovgʻa tarqatishni topdingizmi? Post havolasini qoʻying — tekshiruvdan soʻng u saytda paydo boʻladi.",
    fUrl: "Post havolasi *",
    fAccount: "Tashkilotchi akkaunti",
    fCategory: "Boʻlim *",
    fRegion: "Viloyat *",
    fPrize: "Nima bepul beriladi? *",
    fPrizePh: "Masalan: iPhone 16 Pro va 500 000 soʻmlik 3 ta sertifikat",
    fSend: "Tekshiruvga yuborish",
    fSending: "Yuborilmoqda…",
    fBadUrl: "Instagram post havolasi kerak, masalan: https://www.instagram.com/p/ABC123/",
    fShort: "Sovgʻani kamida bir necha soʻz bilan yozing.",
    fNoDb: "Xizmat vaqtincha ishlamayapti.",
    fDup: "Bu aksiya saytda allaqachon bor — rahmat!",
    fFail: "Yuborib boʻlmadi:",
    fOk: "Rahmat! Aksiya tekshiruvga yuborildi va tez orada saytda paydo boʻladi.",
  },
} as const;

export type Dict = (typeof DICT)["ru"];

/** Узбекская латиница по официальной орфографии: o' g' → oʻ gʻ, остальные апострофы между буквами → ʼ. */
export function uzOrtho(s: string): string {
  return s.replace(/([OoGg])['’‘`]/g, "$1ʻ").replace(/([A-Za-zʻ])['’`](?=[A-Za-z])/g, "$1ʼ");
}

const MONTHS: Record<Lang, string[]> = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
};

/** Время по Ташкенту (UTC+5, без перехода на летнее) — одинаково на сервере и в браузере. */
function tashkentParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
}

/** «18 ноября, 10:00» / «18-noyabr, soat 10:00». Время не пишем, если 00:00 (начало) или 23:59 (конец без времени). */
export function formatDate(iso: string, lang: Lang): string {
  const p = tashkentParts(iso);
  const nowY = tashkentParts(new Date().toISOString()).y;
  const year = p.y !== nowY ? ` ${p.y}` : "";
  const date = lang === "uz" ? `${p.day}-${MONTHS.uz[p.m]}${year}` : `${p.day} ${MONTHS.ru[p.m]}${year}`;
  const showTime = !((p.hh === 0 && p.mm === 0) || (p.hh === 23 && p.mm === 59));
  if (!showTime) return date;
  const time = `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
  return lang === "uz" ? `${date}, soat ${time}` : `${date}, ${time}`;
}

export function sameTashkentDay(a: string, b: Date): boolean {
  const x = tashkentParts(a);
  const y = tashkentParts(b.toISOString());
  return x.y === y.y && x.m === y.m && x.day === y.day;
}
