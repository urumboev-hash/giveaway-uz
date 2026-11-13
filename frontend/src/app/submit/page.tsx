import type { Metadata } from "next";
import SubmitForm from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Добавить розыгрыш",
  description:
    "Проводите конкурс или нашли гив в Instagram? Добавьте ссылку на пост — после быстрой модерации розыгрыш появится на GiveUz.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-xl py-4 sm:py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Добавить розыгрыш</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Блогер, бренд или просто нашли классный гив? Вставьте ссылку на пост — после модерации он появится в ленте.
      </p>
      <SubmitForm />
    </div>
  );
}
