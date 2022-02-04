export const requestServer = function (that, url, method, body = undefined) {
    return fetch('/api' + url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-player': that.$store.state.playerID,
            'x-room': that.$store.state.room_key,
        },
        body: body ? JSON.stringify(body): undefined
    }).then(async (resp) => {
        if (resp.status !== 200){
            let text = await resp.json()
            console.error(text);
            throw text;
        }
        return resp.json();
    })
}