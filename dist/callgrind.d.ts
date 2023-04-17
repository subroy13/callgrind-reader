/// <reference types="node" />
import { Readable } from "stream";
import { CallGrindParseOutput } from "./interface";
/**
 * CallGrind File Description Reference: https://valgrind.org/docs/manual/cl-format.html
 */
export declare class CallGrind {
    private fstream;
    private profiledb;
    private header;
    private scope;
    private eventList;
    private fileList;
    private functionList;
    errorLines: string[];
    private HEADER_REGEX;
    private REGEXLIST;
    constructor(file: string | Readable);
    parse(): Promise<CallGrindParseOutput>;
    private isCommentLine;
    private getScope;
    private getCallerScope;
    private parseLine;
}
