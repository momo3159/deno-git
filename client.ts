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
}

export const clientFactory = (): Client => {
  const cwd = toFileUrl(Deno.cwd());
  const repository = findRootRepository(cwd);
  return new Client(repository);
};
