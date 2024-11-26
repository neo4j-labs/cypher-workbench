
export function processResult (result) {
    if (result && result.constructor && result.constructor.name === 'Neo4jError') {
        if (result.message && result.message.match) {
            if (result.message.match(/permission denied$/)) {
                throw new Error('You do not have sufficient permission for that operation');
            } else if (result.message.match(/permission denied \(wrong org\)$/)) {
                throw new Error('Item does not exist');
            } else {
                throw new Error(result.message);
            }
        } else {
            throw new Error(result.message);
        }
    }

    var resultSet = {headers: [], rows:[]}
    if (result && result.records && result.records.map) {
        result.records.map(record => {
            if (resultSet.headers.length === 0) {
                resultSet.headers = (record.keys) ? record.keys.filter(key => key !== 'null') : [];
            }
            var hasValues = false;
            var row = {};
            record.keys.forEach(function (key) {
                var value = record.get(key);
                row[key] = value;
                if (value)
                    hasValues = true;
            });
            if (hasValues)
                resultSet.rows.push(row);
        });
    }
    //console.log('resultSet: ', resultSet);
    return resultSet;
}

export function getFirstRowValue (resultSet, key, defaultValue) {
    if (resultSet && resultSet.rows && resultSet.rows.length === 1) {
        return resultSet.rows[0][key];
    } else {
        if (defaultValue) {
            throw new Error(defaultValue);
        } else {
            return null;
        }
    }
}
