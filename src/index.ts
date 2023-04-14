import { CallGrind } from "./callgrind";

const main = async () => {
    const fpath = `${__dirname}/../test/data/cachegrind.sample.out`;
    const cg = new CallGrind(fpath);
    const response = cg.parse();
    return response;
}


main()
    .then((val) => console.log(val))
    .catch((err) => console.log(err));