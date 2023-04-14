import { Readable } from "stream";
import { createReadStream } from "fs";
import * as readline from 'readline';


export interface ProfileDatabase {
    [key: string]: {
        fileName: string;
        functionName: string;
        lines: number[];
        events: {
            [profileevent: string]: number;
        }        
    }
}

export enum CallGrindKeywords {
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
export class CallGrind {

    private fstream: readline.Interface;
    private profiledb: ProfileDatabase = {};
    private header: {[key: string]: any;} = {};
    private scope: {
        section: string;
        parameters?: {[field: string]: string;}
    } = {section: "header"}
    private eventList: string[] = [];
    private fileList: {[fkey: string]: string} = {};
    private functionList: {[fkey: string]: string} = {};

    
    private HEADER_REGEX = /^(\w+):\s(.*)$/;
    private REGEXLIST = {
        [CallGrindKeywords.File]: /^fl=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.Function]: /^fn=(\(\d\))?([^=\n\(\)]+)?$/
    }

    constructor(file: string | Readable) {
        this.fstream = readline.createInterface({
            input: (typeof file === "string") ? createReadStream(file, { encoding: "utf-8" }) : file,
            crlfDelay: Infinity
        });
    }

    async parse() {
        return new Promise((resolve, reject) => {
            this.fstream.on('line', (line) => {
                this.parseLine(line);
            }).on('close', () => {
                resolve(this.profiledb);
            }).on('error', (err) => {
                reject(err);
            })
        })
    }

    private isCommentLine(line: string): boolean {
        return (line.startsWith(CallGrindKeywords.CommentChar));
    }

    private parseLine(line: string) {
        const cleanLine = line.trim();      // remove extra spaces if any

        if (this.isCommentLine(cleanLine)) {
            return;     // return directly for comments
        }

        // start at header section
        if (this.scope.section === "header") {
            const match = line.match(this.HEADER_REGEX);
            if (match) {
                this.header[match[1]] = match[2].trim();
            } else if (!match && line !== "") {
                // this means end of header
                this.scope.section = "specifications";
                this.eventList = String(this.header[CallGrindKeywords.Events] ?? "").split(" ").map((x: string) => x.trim());
            }

            // if line is empty, the scope does not change
        } 
        
        if (this.scope.section === "specifications") {
            if (line === "") {
                return;
            } else if (line.startsWith(CallGrindKeywords.File)) {
                // if it is a file specification
                const filematch = line.match(this.REGEXLIST[CallGrindKeywords.File]);
                if (filematch) {
                    let filename = (filematch[2] ?? "").trim();
                    const fileid = (filematch[1] ?? filename).trim();
                    if (!filename) {
                        filename = this.fileList[fileid];
                    }
                    this.fileList[fileid] = filename;
                    this.scope.parameters = {...(this.scope?.parameters ?? {}), fileid, filename};
                }
            } else if (line.startsWith(CallGrindKeywords.Function)) {
                // if it is a function specification
                const funcmatch = line.match(this.REGEXLIST[CallGrindKeywords.Function]);
                if (funcmatch) {
                    let functionname = (funcmatch[2] ?? "").trim();
                    const functionid = (funcmatch[1] ?? functionname).trim();
                    if (!functionname) {
                        functionname = this.functionList[functionid];
                    }
                    this.functionList[functionid] = functionname;
                    this.scope.parameters = {...(this.scope?.parameters ?? {}), functionid, functionname};
                }
            } else if (line.match(/^\d+(\s\d+)*$/)) {
                // the line contains event based numbers
                const lineNumbers = line.split(" ").map((x) => parseInt(x));    
                const scopeKey = `${this.scope?.parameters?.fileid ?? "(0)"}__${this.scope?.parameters?.functionid ?? "(0)"}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: this.scope?.parameters?.filename ?? "",
                        functionName: this.scope?.parameters?.functionname ?? "",
                        lines: [lineNumbers[0]],
                        events: Object.fromEntries(this.eventList.map((event, i) => ([event, lineNumbers?.[i+1] ?? 0 ])))
                    }
                } else {
                    this.profiledb[scopeKey].lines.push(lineNumbers[0]);
                    for (const [i, event] of this.eventList.entries()) {
                        this.profiledb[scopeKey].events[event] += lineNumbers?.[i+1] ?? 0
                    }
                }
            } else {
                //console.log(`Encountered new types of line: ${line}`);
            }


        }
    }

}


