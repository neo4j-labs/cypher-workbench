
import { 
    VariableValue,
    NodePattern,
    RelationshipPattern,
    RELATIONSHIP_DIRECTION
} from '../cypherPattern';
import { 
    renderCypher,
    getNodePatternPart,
    getRelationshipPatternPart,
    getSetItem
} from './cypherTextOutput'
import DataTypes from '../DataTypes';
import { 
    DataTypeConversionTransform,
    JoinTransform,
    NoOpTransform, 
    TransformInput
 } from './transform';
import { TransformationStep } from './transformationStep';
import { CypherParameterDataSource } from './cypherDataSource';
import { 
    MergeInstruction, 
    SetItems,
    SetItem
} from './cypherDataInstructions';
import { 
    ColumnSource, 
    GraphDestination, 
    DataMapping 
} from './dataMapping';
import {
    createSampleData,
    createSampleDataDefinition,
    createSampleDataModel
} from './testHelper';
import { CypherStatementBuilder } from '../cypherStatementBuilder';

test("renderCypher rowId", () => {
    var cypherParameterDataSource = new CypherParameterDataSource({
        rowVariable: 'row',
        parameterVariable: 'rows'
    });

    var rowIdInput = new TransformInput({
        inputVariable: 'row',
        inputDatatype: DataTypes.String,
        inputName: 'id'
    });

    var noOpTransform = new NoOpTransform({
        input: new TransformInput({
            inputVariable: 'row'
        }),
        outputName: 'row'
    })

    var toIntegerTransformation = new DataTypeConversionTransform({
        input: rowIdInput,
        convertTo: DataTypes.Integer,
        outputName: 'rowId'
    })

    var transformationStep = new TransformationStep({
        transformations: [noOpTransform, toIntegerTransformation]
    });

    var cypher = renderCypher({
        cypherDataSource: cypherParameterDataSource,
        transformationSteps: [transformationStep]
    });

    expect(cypher).toBe('WITH $rows AS rows\nUNWIND rows AS row\nWITH row, toInteger(row.id) AS rowId');
});

test("renderCypher add Person by id", () => {

    var sampleData = createSampleData();
    var tableDef = sampleData.tableDefinition;

    var colIndex = [0,1,2,3,4,5];
    var colSources = colIndex.map(x => {
        return new ColumnSource({
            tableData: sampleData,
            tableDefinition: tableDef,
            columnDefinition: tableDef.columnDefinitions[x],
            columnIndex: x
        })
    })

    // setup data model
    var dataModel = createSampleDataModel();
    var person = dataModel.getNodeLabelByLabel('Person');
    var personId = person.getPropertyByName('id');

    // setup Cypher pattern
    var personNodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person']
    });

    var destPersonId = new GraphDestination({
        dataModel,
        nodeLabel: person,
        nodePattern: personNodePattern,
        propertyDefinition: personId
    });

    var cypherParameterDataSource = new CypherParameterDataSource({
        rowVariable: 'row',
        parameterVariable: 'rows'
    });

    var rowIdInput = new TransformInput({
        inputVariable: 'row',
        inputDatatype: DataTypes.String,
        inputName: 'id'
    });

    var noOpTransform = new NoOpTransform({
        input: new TransformInput({
            inputVariable: 'row'
        }),
        outputName: 'row'
    })

    var toIntegerTransformation = new DataTypeConversionTransform({
        input: rowIdInput,
        convertTo: DataTypes.Integer,
        outputName: 'id'
    })

    var transformationStep = new TransformationStep({
        transformations: [noOpTransform, toIntegerTransformation]
    });

    var dataMappingPersonId = new DataMapping({
        source: colSources[0],
        destination: destPersonId
    });

    var patternPart = getNodePatternPart ({
        //sourceVariable: 'row', // not needed because we did a transform
        destinationVariable: destPersonId.nodePattern.variable, 
        nodeLabel: destPersonId.nodePattern.nodeLabels[0], 
        dataMappings: [dataMappingPersonId]
    });

    var mergeInstruction = new MergeInstruction({
        patternPart
    });

    var cypher = renderCypher({
        cypherDataSource: cypherParameterDataSource,
        transformationSteps: [transformationStep],
        dataInstructions: [mergeInstruction]
    });

    expect(cypher).toBe(`WITH $rows AS rows
UNWIND rows AS row
WITH row, toInteger(row.id) AS id
MERGE (person:Person {id:id})`);
});

test("renderCypher for full data model", () => {

    var sampleData = createSampleData();
    var tableDef = sampleData.tableDefinition;

    var colIndex = [0,1,2,3,4,5];
    var colSources = colIndex.map(x => {
        return new ColumnSource({
            tableData: sampleData,
            tableDefinition: tableDef,
            columnDefinition: tableDef.columnDefinitions[x],
            columnIndex: x
        })
    })

    var dataModel = createSampleDataModel();
    var person = dataModel.getNodeLabelByLabel('Person');
    var personId = person.getPropertyByName('id');
    var personName = person.getPropertyByName('name');

    var company = dataModel.getNodeLabelByLabel('Company');
    var companyName = company.getPropertyByName('name');
    var worksFor = dataModel.getRelationshipType('WORKS_FOR', 'Person', 'Company');

    var address = dataModel.getNodeLabelByLabel('Address');
    var livesAt = dataModel.getRelationshipType('LIVES_AT', 'Person', 'Address');
    var addressId = address.getPropertyByName('id');
    var address1 = address.getPropertyByName('address1');
    var city = address.getPropertyByName('city');
    var state = address.getPropertyByName('state');

    var personNodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person']
    });

    var companyNodePattern = new NodePattern({
        key: 'company',
        variable: 'company',
        nodeLabels: ['Company']
    });

    var addressNodePattern = new NodePattern({
        key: 'address',
        variable: 'address',
        nodeLabels: ['Address']
    });

    var worksForPattern = new RelationshipPattern({
        key: 'works_for',
        types: ['WORKS_FOR'],
        direction: RELATIONSHIP_DIRECTION.RIGHT
    });

    var livesAtPattern = new RelationshipPattern({
        key: 'lives_at',
        types: ['LIVES_AT'],
        direction: RELATIONSHIP_DIRECTION.RIGHT
    });

    var destPersonId = new GraphDestination({
        dataModel,
        nodeLabel: person,
        nodePattern: personNodePattern,
        propertyDefinition: personId
    });

    var destPersonName = new GraphDestination({
        dataModel,
        nodeLabel: person,
        nodePattern: personNodePattern,
        propertyDefinition: personName
    });    

    var destCompanyName = new GraphDestination({
        dataModel,
        nodeLabel: company,
        nodePattern: companyNodePattern,
        propertyDefinition: companyName
    });

    var destAddressId = new GraphDestination({
        dataModel,
        nodeLabel: address,
        nodePattern: addressNodePattern,
        propertyDefinition: addressId
    }); 

    var destAddressAddress1 = new GraphDestination({
        dataModel,
        nodeLabel: address,
        nodePattern: addressNodePattern,
        propertyDefinition: address1
    });    

    var destAddressCity = new GraphDestination({
        dataModel,
        nodeLabel: address,
        nodePattern: addressNodePattern,
        propertyDefinition: city
    });    

    var destAddressState = new GraphDestination({
        dataModel,
        nodeLabel: address,
        nodePattern: addressNodePattern,
        propertyDefinition: state
    });    

    var rowVariableName = 'row';
    var cypherParameterDataSource = new CypherParameterDataSource({
        rowVariable: rowVariableName,
        parameterVariable: 'rows'
    });

    var rowIdInput = new TransformInput({
        inputVariable: rowVariableName,
        inputDatatype: DataTypes.String,
        inputName: 'id'
    });

    var noOpTransform = new NoOpTransform({
        input: new TransformInput({
            inputVariable: rowVariableName
        }),
        outputName: rowVariableName
    })

    var toIntegerTransformation = new DataTypeConversionTransform({
        input: rowIdInput,
        convertTo: DataTypes.Integer,
        outputName: 'id'
    })

    var addressIdJoinTransform = new JoinTransform({
        input: [
            colSources[2],  // address1
            colSources[3],  // city
            colSources[4]   // state
        ],
        sourceVariable: rowVariableName,
        joiner: '_',
        outputName: 'addressId'
    })    

    var transformationStep = new TransformationStep({
        transformations: [
            noOpTransform, 
            toIntegerTransformation,
            addressIdJoinTransform
        ]
    });

    var dataMappingPersonId = new DataMapping({
        source: new VariableValue({ value: 'id'}),
        destination: destPersonId
    });

    var dataMappingPersonName = new DataMapping({
        source: colSources[1],
        destination: destPersonName
    });

    var dataMappingAddressId = new DataMapping({
        source: new VariableValue({ value: 'addressId'}),
        destination: destAddressId
    })

    var dataMappingAddressAddress1 = new DataMapping({
        source: colSources[2],
        destination: destAddressAddress1
    });
    
    var dataMappingAddressCity = new DataMapping({
        source: colSources[3],
        destination: destAddressCity
    });
    
    var dataMappingAddressState = new DataMapping({
        source: colSources[4],
        destination: destAddressState
    });    

    var dataMappingCompanyName = new DataMapping({
        source: colSources[5],
        destination: destCompanyName
    });

    var personVariable = destPersonId.nodePattern.variable;
    var personNodeLabel = destPersonId.nodePattern.nodeLabels[0];

    var companyVariable = destCompanyName.nodePattern.variable;
    var companyNodeLabel = destCompanyName.nodePattern.nodeLabels[0];

    var addressVariable = destAddressId.nodePattern.variable;
    var addressNodeLabel = destAddressId.nodePattern.nodeLabels[0];

    var personMergePatternPart = getNodePatternPart ({
        //sourceVariable: 'row', // not needed because we did a transform
        destinationVariable: personVariable, 
        nodeLabel: personNodeLabel, 
        dataMappings: [dataMappingPersonId]
    });

    var companyMergePatternPart = getNodePatternPart ({
        sourceVariable: rowVariableName,
        destinationVariable: companyVariable, 
        nodeLabel: companyNodeLabel, 
        dataMappings: [dataMappingCompanyName]
    });

    var personToCompanyPatternPart = getRelationshipPatternPart({
        sourceVariable: personVariable,
        destinationVariable: companyVariable, 
        relationshipType: worksForPattern.types[0]
    });

    var addressMergePatternPart = getNodePatternPart ({
        //sourceVariable: 'row', // not needed because we did a transform
        destinationVariable: addressVariable, 
        nodeLabel: addressNodeLabel, 
        dataMappings: [dataMappingAddressId]
    });

    var personToAddressPatternPart = getRelationshipPatternPart({
        sourceVariable: personVariable,
        destinationVariable: addressVariable, 
        relationshipType: livesAtPattern.types[0]
    });    

    var personSetItem = getSetItem({
        sourceVariable: rowVariableName, 
        destinationVariable: personVariable, 
        dataMapping: dataMappingPersonName
    });

    var addressSetAddress1 = getSetItem({
        sourceVariable: rowVariableName, 
        destinationVariable: addressVariable, 
        dataMapping: dataMappingAddressAddress1
    });

    var addressSetCity = getSetItem({
        sourceVariable: rowVariableName, 
        destinationVariable: addressVariable, 
        dataMapping: dataMappingAddressCity
    })

    var addressSetState = getSetItem({
        sourceVariable: rowVariableName, 
        destinationVariable: addressVariable, 
        dataMapping: dataMappingAddressState
    })

    var personMergeInstruction = new MergeInstruction({ patternPart: personMergePatternPart });
    var personSetInstruction = new SetItems({ setItems: [personSetItem]});

    var companyMergeInstruction = new MergeInstruction({ patternPart: companyMergePatternPart });
    var personToCompanyMergeInstruction = new MergeInstruction({ patternPart: personToCompanyPatternPart });
    
    var addressMergeInstruction = new MergeInstruction({ patternPart: addressMergePatternPart });
    var addressSetInstruction = new SetItems({ setItems: [
        addressSetAddress1,
        addressSetCity,
        addressSetState
    ]});

    var personToAddressMergeInstruction = new MergeInstruction({ patternPart: personToAddressPatternPart });    

    var cypher = renderCypher({
        cypherDataSource: cypherParameterDataSource,
        transformationSteps: [transformationStep],
        dataInstructions: [
            personMergeInstruction,
            personSetInstruction,
            companyMergeInstruction,
            personToCompanyMergeInstruction,
            addressMergeInstruction,
            addressSetInstruction,
            personToAddressMergeInstruction
        ]
    });

    //console.log(cypher);

    expect(cypher).toBe(`WITH $rows AS rows
UNWIND rows AS row
WITH row, toInteger(row.id) AS id, apoc.text.join([row.address1, row.city, row.state], '_') AS addressId
MERGE (person:Person {id:id})
SET person.name = row.name
MERGE (company:Company {name:row.company})
MERGE (person)-[:WORKS_FOR]->(company)
MERGE (address:Address {id:addressId})
SET address.address1 = row.address1, address.city = row.city, address.state = row.state
MERGE (person)-[:LIVES_AT]->(address)`);

// MERGE (address:Address {id: line.address1})

});