

export var ensureProperties = (callerName, properties, propertyName) => {
    if (!properties || !properties[propertyName]) {
        throw new Error(`${callerName}: properties and properties.${propertyName} must be specified`);
    }
}


export var tryAgain = (func, howManyTimes, delayBetweenTries) => {
    var howManyTimesTried = 0;
    const localFunc = () => { 
        howManyTimesTried++;
        if (howManyTimesTried <= howManyTimes) {
            setTimeout(() => { func() }, delayBetweenTries)
        }
    }
    localFunc();
}