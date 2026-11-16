import HomeView from "@/components/HomeView";

// ISR: страница пересобирается не чаще раза в 10 минут — быстро и бесплатно на Vercel
export const revalidate = 600;

export default function HomePage() {
  return <HomeView lang="ru" />;
}
