import { redirect } from "next/navigation";
import { getAppToday } from "@/lib/date/today";

export default function DiarioPage() {
  const { date } = getAppToday();
  redirect(`/nutricao/diario/${date}`);
}
