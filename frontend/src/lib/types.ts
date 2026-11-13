export const CATEGORIES = [
  "Техника",
  "Деньги",
  "Авто",
  "Еда и кафе",
  "Красота и одежда",
  "Другое",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  Техника: "📱",
  Деньги: "💸",
  Авто: "🚗",
  "Еда и кафе": "🍔",
  "Красота и одежда": "💄",
  Другое: "🎁",
};

export interface Giveaway {
  id: string;
  post_url: string;
  account_name: string | null;
  image_url: string | null;
  title: string | null;
  prize: string | null;
  conditions: string[] | null;
  end_date: string | null;
  category: Category;
  source_type: "google" | "account" | "hashtag" | "user_submit";
  created_at: string;
}
