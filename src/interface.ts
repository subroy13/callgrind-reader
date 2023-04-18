/**
 * A profile database containing information on functions and lines.
 * Each key is a string representing a unique identifier for a function or line.
 * The value for each key is an object containing information on the corresponding function or line, 
 * including the file name, function name, line numbers, and events (e.g., "cycles", "instructions", etc.).
 */
export interface ProfileDatabase {
    [key: string]: {
        /**
         * The name of the file containing the function or line.
         */
        fileName: string;

        /**
         * The name of the function, if applicable.
         */
        functionName: string;

        /**
         * The line numbers associated with the function or line.
         */
        lines: number[];

        /**
         * An indexable object with string keys representing different profiling events, 
         * such as "walltime" or "cputime". It contains information on events associated with 
         * that function or line, such as the number of cycles or instructions.
         */
        events: {
            [profileevent: string]: number;
        }        
    }
}

/**
 * Represents the output of the CallGrind.parse() method.
 */
export interface CallGrindParseOutput {

    /**
     * A dictionary of profile information keyed by function name.
     */
    profile: ProfileDatabase;

    /**
     * A list of lines which could not be parsed properly, resulting in errors.
     */
    errors: string[];
}