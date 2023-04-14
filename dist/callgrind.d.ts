/// <reference types="node" />
import { Readable } from "stream";
export interface ProfileDatabase {
    [key: string]: {
        fileName: string;
        functionName: string;
        lines: number[];
        events: {
            [profileevent: string]: number;
        };
    };
}
export declare enum CallGrindKeywords {
    CommentChar = "#",
    Positions = "postions",
    Events = "events",
    File = "fl",
    Function = "fn",
    CallCount = "calls",
    CallFileType1 = "cfl",
    CallFileType2 = "cfi",
    CallFunction = "cfn"
}
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
    private HEADER_REGEX;
    private REGEXLIST;
    constructor(file: string | Readable);
    parse(): Promise<unknown>;
    private isCommentLine;
    private parseLine;
}
