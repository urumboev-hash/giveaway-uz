import type { Metadata } from "next";
import SubmitForm from "@/components/SubmitForm";
import { DICT } from "@/lib/i18n";

export const metadata: Metadata = {
  title: DICT.uz.submitTitle,
  description: DICT.uz.submitLead,
  alternates: { canonical: "/uz/submit", languages: { ru: "/submit", uz: "/uz/submit" } },
};

export default function UzSubmitPage() {
  return <SubmitForm lang="uz" />;
}
