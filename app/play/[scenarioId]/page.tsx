import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import GameClient, { type Task, type Scenario } from "./GameClient";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  const [{ data: scenario, error: scenarioError }, { data: tasks, error: tasksError }] =
    await Promise.all([
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

  if (scenarioError || tasksError) {
    throw new Error("Kunne ikke hente spildata – prøv igen om lidt.");
  }

  if (!scenario || !tasks) notFound();

  return <GameClient scenario={scenario as Scenario} tasks={tasks as Task[]} />;
}
