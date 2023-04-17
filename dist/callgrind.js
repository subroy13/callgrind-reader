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
exports.CallGrind = void 0;
const fs_1 = require("fs");
const readline = __importStar(require("readline"));
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
    errorLines = [];
    HEADER_REGEX = /^(\w+):\s(.*)$/;
    REGEXLIST = {
        ["fl" /* CallGrindKeywords.File */]: /^fl=(\(\d\))?([^=\n\(\)]+)?$/,
        ["fn" /* CallGrindKeywords.Function */]: /^fn=(\(\d\))?([^=\n\(\)]+)?$/,
        ["cfl" /* CallGrindKeywords.CallFileType1 */]: /^cfl=(\(\d\))?([^=\n\(\)]+)?$/,
        ["cfi" /* CallGrindKeywords.CallFileType2 */]: /^cfi=(\(\d\))?([^=\n\(\)]+)?$/,
        ["cfn" /* CallGrindKeywords.CallFunction */]: /^cfn=(\(\d\))?([^=\n\(\)]+)?$/,
    };
    constructor(file) {
        this.fstream = readline.createInterface({
            input: (typeof file === "string") ? (0, fs_1.createReadStream)(file, { encoding: "utf-8" }) : file,
            crlfDelay: Infinity
        });
    }
    async parse() {
        this.errorLines = [];
        return new Promise((resolve, reject) => {
            this.fstream.on('line', (line) => {
                this.parseLine(line);
            }).on('close', () => {
                resolve({
                    profile: this.profiledb,
                    errors: this.errorLines
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
    isCommentLine(line) {
        return (line.startsWith("#" /* CallGrindKeywords.CommentChar */));
    }
    getScope() {
        return {
            file: {
                id: this.scope?.parameters?.fileid ?? "(0)",
                name: this.scope?.parameters?.filename ?? ""
            },
            function: {
                id: this.scope?.parameters?.functionid ?? "(0)",
                name: this.scope?.parameters?.functionname ?? ""
            }
        };
    }
    getCallerScope() {
        return {
            file: {
                id: this.scope?.parameters?.callfileid ?? (this.scope?.parameters?.fileid ?? "(0)"),
                name: this.scope?.parameters?.callfilename ?? (this.scope?.parameters?.filename ?? "")
            },
            function: {
                id: this.scope?.parameters?.callfunctionid ?? (this.scope?.parameters?.functionid ?? "(0)"),
                name: this.scope?.parameters?.callfunctionname ?? (this.scope?.parameters?.functionname ?? "")
            }
        };
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
                this.eventList = String(this.header["events" /* CallGrindKeywords.Events */] ?? "").split(" ").map((x) => x.trim());
            }
            // if line is empty, the scope does not change
        }
        if (this.scope.section === "specifications" || this.scope.section === "caller") {
            if (line === "") {
                return;
            }
            else if (line.startsWith("fl" /* CallGrindKeywords.File */)) {
                // if it is a file specification
                const filematch = line.match(this.REGEXLIST["fl" /* CallGrindKeywords.File */]);
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
            else if (line.startsWith("fn" /* CallGrindKeywords.Function */)) {
                // if it is a function specification
                const funcmatch = line.match(this.REGEXLIST["fn" /* CallGrindKeywords.Function */]);
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
            else if (line.startsWith("cfl" /* CallGrindKeywords.CallFileType1 */) || line.startsWith("cfi" /* CallGrindKeywords.CallFileType2 */)) {
                // called function file specification
                const filematch = line.match(this.REGEXLIST[line.startsWith("cfl" /* CallGrindKeywords.CallFileType1 */) ? "cfl" /* CallGrindKeywords.CallFileType1 */ : "cfi" /* CallGrindKeywords.CallFileType2 */]);
                if (filematch) {
                    let callfilename = (filematch[2] ?? "").trim();
                    const callfileid = (filematch[1] ?? callfilename).trim();
                    if (!callfilename) {
                        callfilename = this.fileList[callfileid];
                    }
                    this.fileList[callfileid] = callfilename;
                    this.scope.parameters = { ...(this.scope?.parameters ?? {}), callfileid, callfilename };
                    this.scope.section = "caller";
                }
            }
            else if (line.startsWith("cfn" /* CallGrindKeywords.CallFunction */)) {
                // called function file specification
                const funcmatch = line.match(this.REGEXLIST["cfn" /* CallGrindKeywords.CallFunction */]);
                if (funcmatch) {
                    let callfunctionname = (funcmatch[2] ?? "").trim();
                    const callfunctionid = (funcmatch[1] ?? callfunctionname).trim();
                    if (!callfunctionname) {
                        callfunctionname = this.functionList[callfunctionid];
                    }
                    this.functionList[callfunctionid] = callfunctionname;
                    this.scope.parameters = { ...(this.scope?.parameters ?? {}), callfunctionid, callfunctionname };
                    this.scope.section = "caller";
                }
            }
            else if (line.match(/^\d+(\s\d+)*$/) && this.scope.section === "specifications") {
                // the line contains event based numbers
                const lineNumbers = line.split(" ").map((x) => parseInt(x));
                const scope = this.getScope();
                const scopeKey = `${scope.file.id}__${scope.function.id}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: scope.file.name,
                        functionName: scope.function.name,
                        lines: [lineNumbers[0]],
                        events: Object.fromEntries(this.eventList.map((event, i) => ([event, lineNumbers?.[i + 1] ?? 0])))
                    };
                }
                else {
                    this.profiledb[scopeKey].lines.push(lineNumbers[0]);
                    for (const [i, event] of this.eventList.entries()) {
                        this.profiledb[scopeKey].events[event] = (this.profiledb[scopeKey].events?.[event] || 0) + (lineNumbers?.[i + 1] ?? 0);
                    }
                }
            }
            else if (line.match(/^calls=(\d+)\s(\d+)$/) && this.scope.section === "caller") {
                const callcount = parseInt((line.match(/^calls=(\d+)\s(\d+)$/))?.[1] ?? "0");
                const scope = this.getCallerScope();
                // TODO: CHECK THIS 
                // const parentscope = this.getScope();
                // if (this.profiledb[`${parentscope.file.id}__${parentscope.function.id}`].events?.["__callcount"]) {
                //      // since the parent being called 10 times, for each time, 
                //      // child is being called 50 times, 
                //      // in total 500 calls to child function
                //     callcount *= this.profiledb[`${parentscope.file.id}__${parentscope.function.id}`].events?.["__callcount"];     
                // }
                const scopeKey = `${scope.file.id}__${scope.function.id}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: scope.file.name,
                        functionName: scope.function.name,
                        lines: [],
                        events: { "__callcount": callcount }
                    };
                }
                else {
                    this.profiledb[scopeKey].events["__callcount"] = (this.profiledb[scopeKey].events?.["__callcount"] || 0) + callcount;
                }
            }
            else if (line.match(/^(\d+)\s(\d+)$/) && this.scope.section === "caller") {
                // final line number, change of scope
                const callcost = parseInt((line.match(/^(\d+)\s(\d+)$/))?.[2] ?? "0");
                const scope = this.getCallerScope();
                const scopeKey = `${scope.file.id}__${scope.function.id}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: scope.file.name,
                        functionName: scope.function.name,
                        lines: [],
                        events: { "__callcost": callcost }
                    };
                }
                else {
                    this.profiledb[scopeKey].events["__callcost"] = (this.profiledb[scopeKey].events?.["__callcost"] || 0) + callcost;
                    ;
                }
                this.scope.section = "specifications";
            }
            else {
                this.errorLines.push(line);
            }
        }
    }
}
exports.CallGrind = CallGrind;
//# sourceMappingURL=callgrind.js.map