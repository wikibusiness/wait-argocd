const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios')

const waitForSomeMs = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

  
const run = async () => {
    try {
        const ARGO_ENDPOINT = core.getInput('argo_endpoint');
        const ARGO_USER = core.getInput('argo_user');
        const ARGO_PASSWORD = core.getInput('argo_password');
        const APPLICATION_NAME = core.getInput('application_name');
        const MAX_RETRIES = parseInt(core.getInput('max_retries'));
        const WAIT_MS = parseInt(core.getInput('wait_ms'));


        const { data: tokenData } = await axios.post(
            `${ARGO_ENDPOINT}/api/v1/session`,
            { username: ARGO_USER, password: ARGO_PASSWORD }
        );

        let index = 0;
        let withRefresh = '?refresh=true'
        while (index < MAX_RETRIES) {
            console.log(`Try ${index}`)
            const { data: dataApplication } = await axios.get(
                `${ARGO_ENDPOINT}/api/v1/applications/${APPLICATION_NAME}${withRefresh}`,
                { headers: { Authorization: `Bearer ${tokenData.token}` } }
            );

            // console.log(dataApplication);

            if (dataApplication.status.health.status === 'Healthy' && dataApplication.status.sync.status === 'Synced') {
                console.log(`Application ${APPLICATION_NAME} is healthy.`)
                break;
            }

            console.log(`Application ${APPLICATION_NAME} is not healthy. Status is ${dataApplication.status.health.status}. Sync status is ${dataApplication.status.sync.status}`)
            withRefresh = ''
            index++;
            await waitForSomeMs(WAIT_MS)

            if (index >= MAX_RETRIES) {
                core.setFailed(`Application ${APPLICATION_NAME} is not healthy after ${MAX_RETRIES} retries.`)
                return
            }
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();