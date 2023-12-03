import { InvalidGitObject } from "../errors.ts";

type Signer = {
  name: string;
  email: string;
  timestamp: string; // TODO: 要検討
};

export class Commit {
  hash: string
  treeRef: string;
  parents: string[];
  author: Signer;
  committer: Signer;
  message: string;

  constructor(
    hash: string,
    treeRef: string,
    parents: string[],
    author: Signer,
    committer: Signer,
    message: string,
  ) {
    this.hash = hash;
    this.treeRef = treeRef;
    this.parents = parents;
    this.author = author;
    this.committer = committer;
    this.message = message;
  }
}

export const parseCommitData = (data: string, hash: string): Commit => {
  const [header, ...rest] = data.split("\n\n");
  const message = rest.join("\n\n");

  const metadata = header.split("\n");
  if (metadata.length <= 0) {
    throw new InvalidGitObject("no metadata."); // TODO
  }

  const maybeCommitter = metadata.pop();
  const committer = parseCommitter(maybeCommitter);

  const maybeAuthor = metadata.pop();
  const author = parseAuthor(maybeAuthor);

  metadata.reverse();

  const maybeTreeRef = metadata.pop();
  const treeRef = parseTreeRef(maybeTreeRef);

  metadata.reverse();

  const parents = parseParents(metadata);

  return new Commit(hash, treeRef, parents, author, committer, message);
};

const parseCommitter = (line: string | undefined): Signer => {
  if (line === undefined) {
    throw new InvalidGitObject(
      "[parseCommiter] comitter is not found in commit object",
    );
  }
  const pattern = /committer (?<name>.+) <(?<email>.+)> (?<timestamp>.+)/gu;
  const result = pattern.exec(line);

  if (
    result === null || result?.groups?.name === undefined ||
    result?.groups?.email === undefined ||
    result?.groups?.timestamp === undefined
  ) {
    throw new InvalidGitObject(
      `[parseCommitter] pattern match failed. ${line}`,
    );
  }

  return {
    name: result.groups.name,
    email: result.groups.email,
    timestamp: result.groups.timestamp,
  };
};

const parseAuthor = (line: string | undefined): Signer => {
  if (line === undefined) {
    throw new InvalidGitObject(
      "[parseAuthor] author is not found in commit object",
    );
  }
  const pattern = /author (?<name>.+) <(?<email>.+)> (?<timestamp>.+)/gu;
  const result = pattern.exec(line);

  if (
    result === null || result?.groups?.name === undefined ||
    result?.groups?.email === undefined ||
    result?.groups?.timestamp === undefined
  ) {
    throw new InvalidGitObject(`[parseAuthor] pattern match failed. ${line}`);
  }

  return {
    name: result.groups.name,
    email: result.groups.email,
    timestamp: result.groups.timestamp,
  };
};

const parseTreeRef = (line: string | undefined): string => {
  if (line === undefined) {
    throw new InvalidGitObject(
      "[parseTreeRef] treeRef is not found in commit object",
    );
  }

  const pattern = /tree (?<treeRef>.+)/ug;
  const result = pattern.exec(line);

  if (result === null || result?.groups?.treeRef === undefined) {
    throw new InvalidGitObject(`[parseTreeRef] pattern match failed. ${line}`);
  }

  return result.groups.treeRef;
};

const parseParents = (lines: string[]): string[] => {
  if (lines.length === 0) return [];

  const parents: string[] = [];
  const pattern = /parent (?<parentRef>.+)/ug;
  for (const line of lines) {
    const result = pattern.exec(line);
    if (result === null || result?.groups?.parentRef === undefined) {
      throw new InvalidGitObject(
        `[parseParents] pattern match failed. ${line}`,
      );
    }
    parents.push(result.groups.parentRef);
  }
  return parents;
};

export const commitMessageFormat = (commit: Commit): string => {
  return `commit ${commit.hash}
Author: ${commit.author.name} <${commit.author.email}>
Date:   ${commit.author.timestamp}

    ${commit.message}
  `
}