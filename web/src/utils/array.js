class Arrays {

    isEmpty = function (array) {
        if (array) {
            return array.length === 0;
        }
        return true;
    }
}

let arrays = new Arrays();
export default arrays;