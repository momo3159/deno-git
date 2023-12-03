import { clientFactory } from "./client.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { commitMessageFormat, parseCommitData } from "./objects/commit.ts";

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
      const hashString = client.getHEAD() 
      const gitObject = client.getObject(hashString) 
      const commitObj = parseCommitData(gitObject.data, hashString)
      const commitLog = client.traceCommitGraph(commitObj)
      for (const commit of commitLog) {
        console.log(commitMessageFormat(commit))
      }
    }) 
    .parse(Deno.args)
}


