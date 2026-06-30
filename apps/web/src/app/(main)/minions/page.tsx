import { redirect } from "next/navigation";

// "Minions" was renamed to "Decimins". Keep the old URL working.
export default function MinionsRedirect() {
  redirect("/decimins");
}
