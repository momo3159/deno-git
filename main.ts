import { clientFactory } from "./client.ts";
import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { parseCommitData } from "./objects/git_object.ts";

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const client = clientFactory();

  await new Command()
    .name("mygit")
    .version("0.1.0")
    .description("自作Git")
    .action(() => { console.log("main") })
    .command("log", "logコマンド")
    .action(() => {
      const hashString = "e2abcfe74eb3621941ad20aea161f37dfd80b085"
      const gitObject = client.getObject(hashString) 
      const commitObj = parseCommitData(gitObject.data)
      console.log(gitObject)
      console.log(commitObj)
    }) 
    .parse(Deno.args)
}


