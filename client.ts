import { toFileUrl, fromFileUrl, dirname, join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { GitRepositoryNotFoundError, SystemError } from "./errors.ts";

const findRootRepository = (path: URL): URL => {
  try {
    const dirEntries = Array.from(Deno.readDirSync(path))
    if (dirEntries.some(entry => entry.name === '.git')) {
      return toFileUrl(join(fromFileUrl(path), ".git"))
    }
    const parent = dirname(fromFileUrl(path))
    const parentUrl = toFileUrl(parent)

    if (parent === fromFileUrl(path)) {
      throw new GitRepositoryNotFoundError('.git is not fuond.') 
    }
    
    return findRootRepository(parentUrl)
  } catch(e) {
    if (e instanceof GitRepositoryNotFoundError) throw e
    else throw new SystemError("can't get .git repository", {cause: e})    
  }
}

class Client {
  repository: URL
  constructor(repository: URL) {
    this.repository = repository
  }
}


export const clientFactory = (): Client => {
  const cwd = toFileUrl(Deno.cwd())
  const repository = findRootRepository(cwd)
  return new Client(repository)
}