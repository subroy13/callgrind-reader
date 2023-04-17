
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

export interface CallGrindParseOutput {
    profile: ProfileDatabase;
    errors: string[];
}