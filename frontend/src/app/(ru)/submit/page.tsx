import type { Metadata } from "next";
import SubmitForm from "@/components/SubmitForm";
import { DICT } from "@/lib/i18n";

export const metadata: Metadata = {
  title: DICT.ru.submitTitle,
  description: DICT.ru.submitLead,
  alternates: { canonical: "/submit", languages: { ru: "/submit", uz: "/uz/submit" } },
};

export default function SubmitPage() {
  return <SubmitForm lang="ru" />;
}
