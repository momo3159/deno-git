import { InvalidGitObject, SystemError } from "../errors.ts";
import * as zlib from "node:zlib";
import { Buffer } from "node:buffer";
import { MissingArgumentError } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/_errors.ts";

type Kind = "tree" | "commit" | "blob" | "tag";
export function isKind(maybeKind: string): maybeKind is Kind {
  return ["tree", "commit", "blob", "tag"].some((elem) => elem === maybeKind);
}

export class GitObject {
  hash: string;
  kind: Kind;
  size: number;
  data: string;

  constructor(hash: string, kind: Kind, size: number, data: string) {
    this.hash = hash;
    this.kind = kind;
    this.size = size;
    this.data = data;
  }
}

export const inflateObject = (objectBin: Buffer): string => {
  try {
    return zlib.inflateSync(objectBin).toString();
  } catch (e) {
    throw new SystemError(
      "[inflateObject] failed to inflate binary using zlib",
      { cause: e },
    );
  }
};

export const parseObject = (hash: string, objectStr: string): GitObject => {
  const [header, data, ...rest] = objectStr.split("\x00");
  if (rest.length > 0) {
    throw new InvalidGitObject(
      `[parseObject] failed to parse object. ${objectStr}`,
    );
  }

  const [kind, size_, ...rest_] = header.split(" ");
  if (rest_.length > 0) {
    throw new InvalidGitObject(
      `[parseObject] failed to parse object. ${rest_}`,
    );
  }

  if (!isKind(kind)) {
    throw new InvalidGitObject(
      `[parseObject] failed to parse object. kind is invalid. ${kind}, ${objectStr}`,
    );
  }

  const size = Number(size_);
  if (isNaN(size)) {
    throw new InvalidGitObject(
      `[parseObject] failed to parse object. size is invalid. ${objectStr}`,
    );
  }

  return new GitObject(hash, kind, size, data);
};

type Signer = {
  name: string;
  email: string;
  timestamp: string; // TODO: 要検討
};

export class Tree {}
export class Commit {
  treeRef: string;
  parents: string[];
  author: Signer;
  committer: Signer;
  message: string;

  constructor(
    treeRef: string,
    parents: string[],
    author: Signer,
    committer: Signer,
    message: string,
  ) {
    this.treeRef = treeRef;
    this.parents = parents;
    this.author = author;
    this.committer = committer;
    this.message = message;
  }
}

export class Blob {}
export class Tag {}

export const parseCommitData = (data: string): Commit => {
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

  return new Commit(treeRef, parents, author, committer, message);
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
