
import { deserializeObject, serializeObject } from '../graphUtil';
import DataTypes from '../DataTypes';
import { GeneralDataSourceInstanceMapper } from './generalDataSource';
import {
    createSampleDataDefinition,
} from './testHelper';

test('test serialize/deserialize data definition', () => {

    expect(true).toBe(true);
    var dataDef = createSampleDataDefinition();

    var json = serializeObject(dataDef);

    //console.log(json); 
    var deserializedDataDef = deserializeObject(json, GeneralDataSourceInstanceMapper);
    //console.log(deserializedDataDef);

    var tableDef = deserializedDataDef.getTableDefinitionByKey('table1');

    expect(tableDef).not.toBeNull();

    var companyDef = tableDef.getColumnDefinitionByName('company');
    expect(companyDef).not.toBeNull();

    expect(companyDef.datatype).toBe(DataTypes.String);

});
