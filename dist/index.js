"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const callgrind_1 = require("./callgrind");
const main = async () => {
    const fpath = `${__dirname}/../test/data/cachegrind.sample.out`;
    const cg = new callgrind_1.CallGrind(fpath);
    const response = cg.parse();
    return response;
};
main()
    .then((val) => console.log(val))
    .catch((err) => console.log(err));
//# sourceMappingURL=index.js.map