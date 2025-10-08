
export const getSort = (sort: any) => {
    let sortOrder = "";
    let sortField = "";
    let keys = Object.keys(sort);
    if (keys.length > 0) {
        sortField = keys[0];
        sortOrder = sort[sortField];
    }
    return [sortOrder, sortField,]
}
