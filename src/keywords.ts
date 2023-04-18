/**
 * Enum representing the keywords used in a Callgrind profile file.
 */
export const enum CallGrindKeywords {
    /**
     * Character used to indicate a comment in a Callgrind file.
     */
    CommentChar = "#",

    /**
     * Keyword indicating position information for the profile file.
     */
    Positions = "postions",

    /**
     * Keyword indicating event information for the profile file.
     */
    Events = "events",

    /**
     * Keyword indicating the file name for a function in the profile.
     */
    File = "fl",

    /**
     * Keyword indicating the function name for a function in the profile.
     */
    Function = "fn",

    /**
     * Keyword indicating the number of times a function was called.
     */
    CallCount = "calls",

    /**
     * Keyword indicating the call graph file type.
     */
    CallFileType1 = "cfl",

    /**
     * Keyword indicating the call graph file type.
     */
    CallFileType2 = "cfi",

    /**
     * Keyword indicating the calling function name.
     */
    CallFunction = "cfn"
}
