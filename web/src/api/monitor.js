import request from "../common/request";

class MonitorApi {
    getData = async () => {
        let result = await request.get('/overview/ps');
        if (result['code'] !== 1) {
            return {};
        }
        let data = result['data'];
        let netIO = [];
        for (let i = 0; i < data['netIO'].length; i++) {
            let item = data['netIO'][i];
            netIO.push({
                time: item['time'],
                read: item['read'] / 1024 / 1024 / 1024,
                write: item['write'] / 1024 / 1024 / 1024,
            });
        }
        data['netIO'] = netIO;

        let diskIO = [];
        for (let i = 0; i < data['diskIO'].length; i++) {
            let item = data['diskIO'][i];
            diskIO.push({
                time: item['time'],
                read: item['read'] / 1024 / 1024 / 1024,
                write: item['write'] / 1024 / 1024 / 1024,
            });
        }
        data['diskIO'] = diskIO;

        return data
    }
}

let monitorApi = new MonitorApi();
export default monitorApi;