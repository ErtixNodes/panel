test('Jest works', () => {
    expect(true).toBe(true);
});

var request = require('supertest');

request = request('http://localhost:3000');

test('Can ping auth', () => {
    var res = request()
        .get('/dash/_');

    expect(res.headers["Content-Type"]).toMatch(/json/);
    expect(res.status).toEqual(200);
    expect(res.body.auth).toEqual(true);
});
