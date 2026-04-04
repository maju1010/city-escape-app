import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import GameClient from "./GameClient";

type Task = {
  id: string;
  order_number: number;
  title: string;
  location_name: string;
  latitude: number;
  longitude: number;
  narrative_intro: string;
  question: string;
  answer: string;
  answer_type: "text" | "photo";
  narrative_reward: string;
  hint1: string;
  hint2: string;
  hint3: string;
};

export default async function PlayPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  const [{ data: scenario }, { data: tasks }] = await Promise.all([
    supabase
      .from("scenarios")
      .select("id, title, intro")
      .eq("id", scenarioId)
      .single(),
    supabase
      .from("tasks")
      .select("*")
      .eq("scenario_id", scenarioId)
      .order("order_number"),
  ]);

  if (!scenario || !tasks) notFound();

  return <GameClient scenario={scenario} tasks={tasks as Task[]} />;
}
