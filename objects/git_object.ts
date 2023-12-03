import { InvalidGitObject, SystemError } from "../errors.ts";
import * as zlib from "node:zlib";
import { Buffer } from "node:buffer";

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
export class Tree {}
export class Blob {}
export class Tag {}

