import {
  dirname,
  fromFileUrl,
  join,
  toFileUrl,
} from "https://deno.land/std@0.208.0/path/mod.ts";
import {
  GitRepositoryNotFoundError,
  SystemError,
} from "./errors.ts";

import { Buffer } from "node:buffer";
import {
  GitObject,
  inflateObject,
  parseObject,
} from "./objects/git_object.ts";
import { Commit, parseCommitData } from "./objects/commit.ts";
import { Queue } from "./common/queue.ts";

const findRootRepository = (path: URL): URL => {
  try {
    const dirEntries = Array.from(Deno.readDirSync(path));
    if (dirEntries.some((entry) => entry.name === ".git")) {
      return toFileUrl(join(fromFileUrl(path), ".git"));
    }
    const parent = dirname(fromFileUrl(path));
    const parentUrl = toFileUrl(parent);

    if (parent === fromFileUrl(path)) {
      throw new GitRepositoryNotFoundError(".git is not fuond.");
    }

    return findRootRepository(parentUrl);
  } catch (e) {
    if (e instanceof GitRepositoryNotFoundError) throw e;
    else throw new SystemError("can't get .git repository", { cause: e });
  }
};

class Client {
  repository: URL;
  constructor(repository: URL) {
    this.repository = repository;
  }

  getHEAD(): string {
    const pattern = /ref: (?<ref>refs\/heads\/.+)/ug
    try {
      const path = join(fromFileUrl(this.repository), 'HEAD')
      const head = Deno.readTextFileSync(path)
      const result  = pattern.exec(head)
      if (result === null) {
        return head.trim();
      } else if (result?.groups?.ref !== undefined) {
        return Deno.readTextFileSync(
          join(fromFileUrl(this.repository), result.groups.ref)
        ).trim()
      } else {
        throw new SystemError(`invalid HEAD file. ${head}`)
      }
    } catch(e) {
      throw new SystemError("can't read HEAD file.", {cause: e})
    }
 }

  getObject(hash: string): GitObject {
    const objectPath = join(
      fromFileUrl(this.repository),
      "objects",
      hash.substring(0, 2),
      hash.substring(2),
    );
    const binary = Buffer.from(Deno.readFileSync(objectPath));
    const objectStr = inflateObject(binary);
    const gitObject = parseObject(hash, objectStr);
    return gitObject;
  }

  traceCommitGraph(from: Commit): Commit[] {
    const result: Commit[] = []
    const queue: Queue<Commit> = new Queue()
    const visited: Commit[] = []
    queue.push(from) 

    while (queue.size() > 0) {
      const current = queue.front() as Commit
      if (visited.length > 0 && visited.some(commit => commit.hash === current.hash)) {
        // すでにresultにある場合→訪問済みなのでスキップ
        // ブランチが派生するポイントで生じる
        queue.pop()
        continue;
      }

      for (const parentHash of current.parents) {
        const obj = this.getObject(parentHash)
        const parent = parseCommitData(obj.data, parentHash) 
        queue.push(parent)
      } 
      result.push(current)
      visited.push(current)
      queue.pop()
    }

    return result
  }
}

export const clientFactory = (): Client => {
  const cwd = toFileUrl(Deno.cwd());
  const repository = findRootRepository(cwd);
  return new Client(repository);
};
