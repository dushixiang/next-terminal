import {hasMenu} from "../../service/permission";

const Show = ({menu, children}) => {
    if (Array.isArray(menu)) {
        if (hasMenu(...menu)) {
            return children;
        }
    }else {
        if (hasMenu(menu)) {
            return children;
        }
    }

    return undefined;
}

export default Show;