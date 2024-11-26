
import Timer from './timerUtil';


test('test timer util', async () => {
    var timer = new Timer('testTimer');
    timer.setSilent(true);
    timer.start('starting');
    timer.record('event 1');

    await new Promise(resolve => setTimeout(resolve, 20));

    timer.record('event 2');
    timer.stop('stopping');

    var timedMessages = timer.getTimedMessages();
    expect(timedMessages.length).toBe(4);
    expect(timedMessages[0].deltaTime).toBe(0);
    expect(timedMessages[1].deltaTime).toBeLessThanOrEqual(2);
    expect(timedMessages[2].deltaTime).toBeGreaterThanOrEqual(18);
    expect(timedMessages[3].deltaTime).toBeGreaterThanOrEqual(0);
});

