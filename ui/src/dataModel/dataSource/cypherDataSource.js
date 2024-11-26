

export class CypherRowDataSource {
    constructor (props) {
        this.props = props || {};
        const {
            rowVariable 
        } = props;
        this.rowVariable = rowVariable;
    }
}

/*
    WITH $rows as rows
    UNWIND rows as row
*/
export class CypherParameterDataSource extends CypherRowDataSource {
    constructor (props) {
        // sets rowVariable - line is rowVariable in examples above
        super(props);
        props = props || {};
        var {
            parameterVariable
        } = props;

        this.parameterVariable = parameterVariable;
    }

    toCypher = () => {
        var cypher = `WITH $${this.parameterVariable} AS ${this.parameterVariable}`;
        cypher += `\nUNWIND ${this.parameterVariable} AS ${this.rowVariable}`;
        return cypher;
    }

}

/*
LOAD CSV FROM '<file url>' AS line
LOAD CSV WITH HEADERS FROM '<file url>' AS line
USING PERIODIC COMMIT 500 LOAD CSV WITH HEADERS FROM '<file url>' AS line
LOAD CSV FROM '<file url>' AS line FIELDTERMINATOR ';'
*/
export class CypherLoadCSVDataSource extends CypherRowDataSource {
    constructor (props) {
        // sets rowVariable - line is rowVariable in examples above
        super(props);
        props = props || {};
        var {
            fileUrl,
            withHeaders,
            usePeriodicCommit,
            periodicCommitInterval,
            fieldTerminator
        } = props;

        this.fileUrl = fileUrl;
        this.withHeaders = withHeaders;
        this.usePeriodicCommit = usePeriodicCommit;
        this.periodicCommitInterval = periodicCommitInterval;
        this.fieldTerminator = fieldTerminator;
    }

    toCypher = () => {
        var cypher = '';
        if (this.usePeriodicCommit) {
            const periodicCommitInterval = (this.periodicCommitInterval) ? this.periodicCommitInterval : 500;
            cypher = `USING PERIODIC COMMIT ${periodicCommitInterval}\n`;
        }
        cypher += (this.withHeaders) ? 'LOAD CSV WITH HEADERS FROM ' : 'LOAD CSV FROM ';
        cypher += `'${this.fileUrl}' AS ${this.rowVariable}`;
        if (this.fieldTerminator) {
            cypher += ` FIELDTERMINATOR '${this.fieldTerminator}'`;
        }
        return cypher;
    }
}

/* 
    WITH [
        {col1: 'val1', col2: 0},
        {col1: 'val3', col2: 1},
        {col1: 'val5', col2: 2}
        ...
    ] as data
*/
export class CypherEmbeddedData extends CypherRowDataSource {

    constructor (props) {
        // sets rowVariable - line is rowVariable in examples above
        super(props);
        props = props || {};
        var {
            embeddedData,
            embeddedDataVariable
        } = props;

        // embedded data should be passed as a string in proper cypher convention (i.e. strings are quoted)
        this.embeddedData = embeddedData;
        this.embeddedDataVariable = embeddedDataVariable;
    }

    toCypher = () => {
        var cypher = `WITH ${this.embeddedData} AS ${this.embeddedDataVariable}`;
        cypher += `\nUNWIND ${this.embeddedDataVariable} AS ${this.rowVariable}`;
        return cypher;
    }
}