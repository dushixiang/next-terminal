import request from "../common/request";

class TagApi {

    getAll = async () => {
        let result = await request.get(`/tags`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

let tagApi = new TagApi();
export default tagApi;