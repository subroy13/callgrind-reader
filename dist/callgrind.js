"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallGrind = exports.CallGrindKeywords = void 0;
const fs_1 = require("fs");
const readline = __importStar(require("readline"));
var CallGrindKeywords;
(function (CallGrindKeywords) {
    CallGrindKeywords["CommentChar"] = "#";
    CallGrindKeywords["Positions"] = "postions";
    CallGrindKeywords["Events"] = "events";
    CallGrindKeywords["File"] = "fl";
    CallGrindKeywords["Function"] = "fn";
    CallGrindKeywords["CallCount"] = "calls";
    CallGrindKeywords["CallFileType1"] = "cfl";
    CallGrindKeywords["CallFileType2"] = "cfi";
    CallGrindKeywords["CallFunction"] = "cfn";
})(CallGrindKeywords = exports.CallGrindKeywords || (exports.CallGrindKeywords = {}));
/**
 * CallGrind File Description Reference: https://valgrind.org/docs/manual/cl-format.html
 */
class CallGrind {
    fstream;
    profiledb = {};
    header = {};
    scope = { section: "header" };
    eventList = [];
    fileList = {};
    functionList = {};
    HEADER_REGEX = /^(\w+):\s(.*)$/;
    REGEXLIST = {
        [CallGrindKeywords.File]: /^fl=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.Function]: /^fn=(\(\d\))?([^=\n\(\)]+)?$/
    };
    constructor(file) {
        this.fstream = readline.createInterface({
            input: (typeof file === "string") ? (0, fs_1.createReadStream)(file, { encoding: "utf-8" }) : file,
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
            });
        });
    }
    isCommentLine(line) {
        return (line.startsWith(CallGrindKeywords.CommentChar));
    }
    parseLine(line) {
        const cleanLine = line.trim(); // remove extra spaces if any
        if (this.isCommentLine(cleanLine)) {
            return; // return directly for comments
        }
        // start at header section
        if (this.scope.section === "header") {
            const match = line.match(this.HEADER_REGEX);
            if (match) {
                this.header[match[1]] = match[2].trim();
            }
            else if (!match && line !== "") {
                // this means end of header
                this.scope.section = "specifications";
                this.eventList = String(this.header[CallGrindKeywords.Events] ?? "").split(" ").map((x) => x.trim());
            }
            // if line is empty, the scope does not change
        }
        if (this.scope.section === "specifications") {
            if (line === "") {
                return;
            }
            else if (line.startsWith(CallGrindKeywords.File)) {
                // if it is a file specification
                const filematch = line.match(this.REGEXLIST[CallGrindKeywords.File]);
                if (filematch) {
                    let filename = (filematch[2] ?? "").trim();
                    const fileid = (filematch[1] ?? filename).trim();
                    if (!filename) {
                        filename = this.fileList[fileid];
                    }
                    this.fileList[fileid] = filename;
                    this.scope.parameters = { ...(this.scope?.parameters ?? {}), fileid, filename };
                }
            }
            else if (line.startsWith(CallGrindKeywords.Function)) {
                // if it is a function specification
                const funcmatch = line.match(this.REGEXLIST[CallGrindKeywords.Function]);
                if (funcmatch) {
                    let functionname = (funcmatch[2] ?? "").trim();
                    const functionid = (funcmatch[1] ?? functionname).trim();
                    if (!functionname) {
                        functionname = this.functionList[functionid];
                    }
                    this.functionList[functionid] = functionname;
                    this.scope.parameters = { ...(this.scope?.parameters ?? {}), functionid, functionname };
                }
            }
            else if (line.match(/^\d+(\s\d+)*$/)) {
                // the line contains event based numbers
                const lineNumbers = line.split(" ").map((x) => parseInt(x));
                const scopeKey = `${this.scope?.parameters?.fileid ?? "(0)"}__${this.scope?.parameters?.functionid ?? "(0)"}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: this.scope?.parameters?.filename ?? "",
                        functionName: this.scope?.parameters?.functionname ?? "",
                        lines: [lineNumbers[0]],
                        events: Object.fromEntries(this.eventList.map((event, i) => ([event, lineNumbers?.[i + 1] ?? 0])))
                    };
                }
                else {
                    this.profiledb[scopeKey].lines.push(lineNumbers[0]);
                    for (const [i, event] of this.eventList.entries()) {
                        this.profiledb[scopeKey].events[event] += lineNumbers?.[i + 1] ?? 0;
                    }
                }
            }
            else {
                //console.log(`Encountered new types of line: ${line}`);
            }
        }
    }
}
exports.CallGrind = CallGrind;
//# sourceMappingURL=callgrind.js.map