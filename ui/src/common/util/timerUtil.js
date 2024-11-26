
export default class Timer {

    constructor (id) {
        this.id = id;
        this.silent = false;
        this.startTime = 0;
    }

    setSilent = (silent) => {
        this.silent = silent;
    }

    messages = [];

    start (message) {
        this.startTime = new Date().getTime();
        message = (message) ? message : 'start';
        this.messages = [];
        this.addTimedMessage(message);
        return this;
    }

    addTimedMessage (message, totalTime) {
        this.messages.push({
            message: (message) ? (message) : '',
            time: new Date().getTime(),
            totalTime: totalTime
        });
    }

    record (message) {
        this.addTimedMessage(message);
        return this;
    }

    pad = (howMany) => (s) => String(s).padStart(howMany, '0');

    getTimeString = (d) => {
        const p2 = this.pad(2);
        const p3 = this.pad(3);

        return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
    }

    getTimedMessages = () => {
        var previousTime = null;
        var consoleMessages = [];
        this.messages.forEach((timedMessage, i) => {
            var deltaTime = (i !== 0) ? timedMessage.time - previousTime : 0;
            var extraStr = '';
            if (i === 0) {
                var d = new Date(timedMessage.time);
                extraStr = ` :time start: ${this.getTimeString(d)}`
            } else if (timedMessage.totalTime !== undefined) {
                extraStr = ` :total time: ${timedMessage.totalTime} ms`
            }

            consoleMessages.push({
                deltaTime: deltaTime,
                message: `${this.id}: ${timedMessage.message}: elapsed time: ${deltaTime} ms${extraStr}`
            });
            previousTime = timedMessage.time;
        });
        return consoleMessages;
    }

    stop (message) {
        message = (message) ? message : 'stop';
        var totalTime = new Date().getTime() - this.startTime;
        this.addTimedMessage(message, totalTime);
        if (!this.silent) {
            this.getTimedMessages().map(timedMessage => {
                console.log(timedMessage.message);
            });
        }
        return this;
    }

}
