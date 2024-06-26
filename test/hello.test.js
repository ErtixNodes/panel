test('Jest works', () => {
    expect(true).toBe(true);
});

const BASE = 'http://localhost:3000';
const fetch = require('node-fetch');

test('Can ping auth', async () => {
    var res = await fetch(BASE + '/dash/_');

    expect(res.status).toEqual(200);

    var body = await res.json();
    expect(body.auth).toEqual(true);
});
