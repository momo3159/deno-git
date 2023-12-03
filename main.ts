import { clientFactory } from "./client.ts";

export function add(a: number, b: number): number {
  return a + b;
}
// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const client = clientFactory();
  console.log(client)
}


