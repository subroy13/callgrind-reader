import { Readable } from "stream";
import { createReadStream } from "fs";
import * as readline from 'readline';
import { CallGrindParseOutput, ProfileDatabase } from "./interface";
import { CallGrindKeywords } from "./keywords";

/**
 * This class provides a parser for callgrind files. It can be used to extract
 * profile information from the callgrind file. Specification of callgrind type
 * files can be found in [valgrind](https://valgrind.org/docs/manual/cl-format.html) website.
 */
export class CallGrind {

    /**
     * The `readline.Interface` instance that is used to read the file.
     * 
     * @private
     */
    private fstream: readline.Interface;

    /**
     * The profile database that stores the extracted profile information.
     * 
     * @private
     */
    private profiledb: ProfileDatabase = {};

    /**
     * The header section of the callgrind file.
     * 
     * @public
     */
    public header: {[key: string]: any;} = {};

    /**
     * The current scope of the parser.
     * 
     * @private
     */
    private scope: {
        section: string;
        parameters?: {[field: string]: string;}
    } = {section: "header"}

    /**
     * The list of events specified in the callgrind file.
     * 
     * @private
     */
    private eventList: string[] = [];

    /**
     * The list of files specified in the callgrind file.
     * 
     * @private
     */
    private fileList: {[fkey: string]: string} = {};

    /**
     * The list of functions specified in the callgrind file.
     * 
     * @private
     */
    private functionList: {[fkey: string]: string} = {};

    /**
     * The list of error lines encountered during parsing.
     * 
     * @public
     */
    public errorLines: string[] = [];

    /**
     * The regular expression for matching header lines.
     * 
     * @private
     */
    private HEADER_REGEX = /^(\w+):\s(.*)$/;

    /**
     * The regular expression list for matching different types of lines.
     * 
     * @private
     */
    private REGEXLIST = {
        [CallGrindKeywords.File]: /^fl=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.Function]: /^fn=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.CallFileType1]: /^cfl=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.CallFileType2]: /^cfi=(\(\d\))?([^=\n\(\)]+)?$/,
        [CallGrindKeywords.CallFunction]: /^cfn=(\(\d\))?([^=\n\(\)]+)?$/,
    }

    /**
     * Creates an instance of `CallGrind`.
     * 
     * @param {string | Readable} file - The `file` parameter is either a string representing the path
     * to a file or a `Readable` stream for the callgrind file to be parsed.
     */
    constructor(file: string | Readable) {
        this.fstream = readline.createInterface({
            input: (typeof file === "string") ? createReadStream(file, { encoding: "utf-8" }) : file,
            crlfDelay: Infinity
        });
    }

    /**
     * Parses the callgrind file and returns the extracted profile information.
     * 
     * @returns A promise that resolves to the extracted profile information.
     */
    async parse(): Promise<CallGrindParseOutput> {
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
            })
        })
    }

    /**
     * Checks if a line is a comment line.
     * 
     * @param line - The line to be checked.
     * @returns `true` if the line is a comment line, `false` otherwise.
     * @private
     */
    private isCommentLine(line: string): boolean {
        return (line.startsWith(CallGrindKeywords.CommentChar));
    }

    /**
     * Returns the current scope of the parser.
     * 
     * @returns The current scope of the parser.
     * @private
     */
    private getScope(): { file: {id: string; name: string;}, function: { id: string; name: string; }} {
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

    /**
     * Returns the current scope of the caller function in the parser.
     * 
     * @returns The current scope of the caller function in the parser.
     * @private
     */
    private getCallerScope(): { file: {id: string; name: string;}, function: { id: string; name: string; }} {
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


    /**
     * Parses a single line of a Callgrind file asynchronously, updating the internal states of the CallGrind object.
     * 
     * @param line A single line from a Callgrind file.
     * @returns A Promise that resolves to void.
     */
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
        
        if (this.scope.section === "specifications" || this.scope.section === "caller") {
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
            } else if (line.startsWith(CallGrindKeywords.CallFileType1) || line.startsWith(CallGrindKeywords.CallFileType2)) {
                // called function file specification
                const filematch = line.match(this.REGEXLIST[line.startsWith(CallGrindKeywords.CallFileType1) ? CallGrindKeywords.CallFileType1 : CallGrindKeywords.CallFileType2]);
                if (filematch) {
                    let callfilename = (filematch[2] ?? "").trim();
                    const callfileid = (filematch[1] ?? callfilename).trim();
                    if (!callfilename) {
                        callfilename = this.fileList[callfileid];
                    }
                    this.fileList[callfileid] = callfilename;
                    this.scope.parameters = {...(this.scope?.parameters ?? {}), callfileid, callfilename};
                    this.scope.section = "caller";
                }
            } else if (line.startsWith(CallGrindKeywords.CallFunction)) {
                // called function file specification
                const funcmatch = line.match(this.REGEXLIST[CallGrindKeywords.CallFunction]);
                if (funcmatch) {
                    let callfunctionname = (funcmatch[2] ?? "").trim();
                    const callfunctionid = (funcmatch[1] ?? callfunctionname).trim();
                    if (!callfunctionname) {
                        callfunctionname = this.functionList[callfunctionid];
                    }
                    this.functionList[callfunctionid] = callfunctionname;
                    this.scope.parameters = {...(this.scope?.parameters ?? {}), callfunctionid, callfunctionname};
                    this.scope.section = "caller";
                }
            } else if (line.match(/^\d+(\s\d+)*$/) && this.scope.section === "specifications") {
                // the line contains event based numbers
                const lineNumbers = line.split(" ").map((x) => parseInt(x));  
                const scope = this.getScope();
                const scopeKey = `${scope.file.id}__${scope.function.id}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: scope.file.name,
                        functionName: scope.function.name,
                        lines: [lineNumbers[0]],
                        events: Object.fromEntries(this.eventList.map((event, i) => ([event, lineNumbers?.[i+1] ?? 0 ])))
                    }
                } else {
                    this.profiledb[scopeKey].lines.push(lineNumbers[0]);
                    for (const [i, event] of this.eventList.entries()) {
                        this.profiledb[scopeKey].events[event] = (this.profiledb[scopeKey].events?.[event] || 0) + (lineNumbers?.[i+1] ?? 0)
                    }
                }
            } else if (line.match(/^calls=(\d+)\s(\d+)$/) && this.scope.section === "caller") {
                const callcount = parseInt((line.match(/^calls=(\d+)\s(\d+)$/))?.[1] ?? "0");
                const scope = this.getCallerScope();
                const scopeKey = `${scope.file.id}__${scope.function.id}`;
                if (!this.profiledb?.[scopeKey]) {
                    this.profiledb[scopeKey] = {
                        fileName: scope.file.name,
                        functionName: scope.function.name,
                        lines: [],
                        events: { "__callcount": callcount }
                    }
                } else {
                    this.profiledb[scopeKey].events["__callcount"] = (this.profiledb[scopeKey].events?.["__callcount"] || 0) + callcount;
                }                
            } else if (line.match(/^(\d+)\s(\d+)$/) && this.scope.section === "caller") {
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
                    }
                } else {
                    this.profiledb[scopeKey].events["__callcost"] = (this.profiledb[scopeKey].events?.["__callcost"] || 0) + callcost;;
                }                
                this.scope.section = "specifications";
            } else {
                this.errorLines.push(line);
            }


        }
    }

}


