import request from "../common/request";

export const GetLicense = async () => {
    let result = await request.get('/license');
    if (result['code'] !== 1) {
        return;
    }
    return result['data'];
}

export const GetMachineId = async () => {
    let result = await request.get('/license/machine-id');
    if (result['code'] !== 1) {
        return;
    }
    return result['data'];
}