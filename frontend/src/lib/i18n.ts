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
  all: { ru: "Весь Узбекистан", uz: "Butun O'zbekiston" },
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
  fergana: { ru: "Ферганская обл.", uz: "Farg'ona viloyati" },
  khorezm: { ru: "Хорезмская обл.", uz: "Xorazm viloyati" },
  karakalpakstan: { ru: "Каракалпакстан", uz: "Qoraqalpog'iston" },
};

export const CATEGORY_LABELS: Record<Category, { ru: string; uz: string }> = {
  Техника: { ru: "Техника", uz: "Texnika" },
  Деньги: { ru: "Деньги", uz: "Pul" },
  Авто: { ru: "Авто", uz: "Avto" },
  "Еда и кафе": { ru: "Еда и кафе", uz: "Ovqat va kafe" },
  "Красота и одежда": { ru: "Красота и одежда", uz: "Go'zallik va kiyim" },
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
    siteTitle: "Instagramdagi tekin narsalar: O'zbekiston bo'ylab o'yinlar, sovg'alar va bepul aksiyalar",
    siteDescription:
      "Instagramdagi barcha bepul konkurslar, giveaway, sovg'alar va tekin aksiyalar butun O'zbekiston bo'ylab: Toshkent, Samarqand, Buxoro, Farg'ona va boshqa viloyatlar. Har 3 soatda yangilanadi.",
    h1a: "Bepul konkurslar va aksiyalar",
    h1b: "O'zbekiston",
    lead: "Instagramdagi barcha tekin narsalar barcha viloyatlar bo'yicha bir joyda. Shartlarni belgilang va ishtirokingizni kuzating — ro'yxatdan o'tmasdan.",
    add: "+ Qo'shish",
    footer: "GiveUz — Instagramdagi bepul konkurslar va aksiyalar agregatori. Biz konkurslar tashkilotchisi emasmiz.",
    searchLabel: "Sovg'a yoki akkaunt bo'yicha qidirish",
    searchPlaceholder: "iPhone, pul, @brand…",
    all: "Hammasi",
    mine: "⭐ Men qatnashyapman",
    region: "Viloyat",
    allRegions: "Barcha viloyatlar",
    emptyMine: "Siz hali birorta ishtirokni belgilamadingiz.",
    empty: "Hech narsa topilmadi. Boshqa viloyat yoki so'rovni sinab ko'ring.",
    conditions: "Shartlar",
    starts: "Boshlanishi",
    ends: "Tugashi",
    endsUnknown: "Muddat ko'rsatilmagan",
    posted: "E'lon qilingan",
    soon: "Tez orada",
    live: "Hozir davom etmoqda",
    endsToday: "Oxirgi kun",
    fresh: "🆕 Yangi",
    share: "Ulashish",
    copied: "Havola nusxalandi",
    sortNew: "Avval yangilari",
    sortEnding: "Tez tugaydiganlar",
    participate: "Instagramda qatnashish ↗",
    joined: "✓ Qatnashyapman",
    join: "Qatnashaman",
    giveaway: "Konkurs",
    at: "soat",
    notifyOn: "🔔 Yangilari haqida xabar berish",
    notifyOff: "🔕 Xabarnomalar yoqilgan",
    notifyRegion: "viloyat bo'yicha",
    notifyAll: "barcha viloyatlar bo'yicha",
    notifyDenied: "Brauzer sozlamalarida xabarnomalar taqiqlangan.",
    notifyUnsupported: "Bu brauzer xabarnomalarni qo'llab-quvvatlamaydi.",
    notifyIos: "iPhone'da: «Ulashish» → «Bosh ekranga qo'shish» ni bosing, saytni belgidan oching va xabarnomalarni yoqing.",
    notifyDone: "Tayyor! Yangi tekin aksiya chiqqanda xabar beramiz.",
    notifyStopped: "Xabarnomalar o'chirildi.",
    notifyError: "Xabarnomalarni yoqib bo'lmadi. Qaytadan urinib ko'ring.",
    submitTitle: "Aksiya qo'shish",
    submitLead:
      "Bloger, brend yoki shunchaki bepul konkurs yoki tarqatishni topdingizmi? Post havolasini qo'ying — moderatsiyadan so'ng u lentada paydo bo'ladi.",
    fUrl: "Post havolasi *",
    fAccount: "Tashkilotchi akkaunti",
    fCategory: "Turkum *",
    fRegion: "Viloyat *",
    fPrize: "Nima bepul beriladi? *",
    fPrizePh: "Masalan: iPhone 16 Pro va 500 000 so'mlik 3 ta sertifikat",
    fSend: "Moderatsiyaga yuborish",
    fSending: "Yuborilmoqda…",
    fBadUrl: "Instagram post havolasi kerak, masalan https://www.instagram.com/p/ABC123/",
    fShort: "Sovg'ani hech bo'lmaganda bir necha so'z bilan yozing.",
    fNoDb: "Xizmat vaqtincha ishlamayapti.",
    fDup: "Bu aksiya bizda allaqachon bor — rahmat!",
    fFail: "Yuborib bo'lmadi:",
    fOk: "Rahmat! Aksiya moderatsiyaga yuborildi va tez orada saytda paydo bo'ladi.",
  },
} as const;

export type Dict = (typeof DICT)["ru"];

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
