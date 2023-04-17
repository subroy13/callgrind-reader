import CallGrind from '../src';

describe('Sanity Test', () => {
    
    it('Test case 1', async () => {
        const fpath = `${__dirname}/data/callgrind-1.out`;
        const cg = new CallGrind(fpath);
        const response = await cg.parse();
        const exprofile = {
            "file.f__main": {
                fileName: "file.f",
                functionName: "main",
                lines: [15, 16],
                events: {
                    Cycles: 110,
                    Instructions: 26,
                    Flops: 2
                }
            }
        };
        expect(response.profile).toBeDefined(),
        expect(response.profile).toEqual(exprofile);
    });

    it('Test case 2', async () => {
        const fpath = `${__dirname}/data/callgrind-2.out`;
        const cg = new CallGrind(fpath);
        const response = await cg.parse();
        const exprofile = {
            "file1.c__main": {
                fileName: "file1.c", 
                functionName: "main",
                lines: [16],
                events: {
                    Instructions: 20
                }
            },
            "file1.c__func1": {
                fileName: "file1.c", 
                functionName: "func1",
                lines: [51],
                events: {
                    Instructions: 100,
                    "__callcount": 1,
                    "__callcost": 400
                }
            },
            "file2.c__func2": {
                fileName: "file2.c", 
                functionName: "func2",
                lines: [20],
                events: {
                    Instructions: 700,
                    "__callcount": 5,
                    "__callcost": 700
                }
            }
        };
        expect(response.profile).toBeDefined(),
        expect(response.errors.length).toBe(0),
        expect(response.profile).toEqual(exprofile);
    });

    it('Test case 3', async () => {
        const fpath = `${__dirname}/data/callgrind-3.out`;
        const cg = new CallGrind(fpath);
        const response = await cg.parse();
        const exprofile = {
            "(1)__(1)": {
                fileName: "file1.c", 
                functionName: "main",
                lines: [16],
                events: {
                    Instructions: 20
                }
            },
            "(1)__(2)": {
                fileName: "file1.c", 
                functionName: "func1",
                lines: [51],
                events: {
                    Instructions: 100,
                    "__callcount": 1,
                    "__callcost": 400
                }
            },
            "(2)__(3)": {
                fileName: "file2.c", 
                functionName: "func2",
                lines: [20],
                events: {
                    Instructions: 700,
                    "__callcount": 5,
                    "__callcost": 700
                }
            }
        };
        expect(response.profile).toBeDefined(),
        expect(response.errors.length).toBe(0),
        expect(response.profile).toEqual(exprofile);
    });

})