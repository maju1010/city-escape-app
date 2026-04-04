import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import GameClient, { type Task, type Scenario } from "./GameClient";

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

  return <GameClient scenario={scenario as Scenario} tasks={tasks as Task[]} />;
}
