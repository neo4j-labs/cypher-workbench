
import { makeDataModelFromData } from "./runAndExportData";
import DataTypes from "../../../dataModel/DataTypes";
import DataModel from "../../../dataModel/dataModel";

const getSampleData = () => {
    let nodesByLabel = {
        Person: [
            {
                labels: ['Person'],
                properties: {
                    name: 'Keanu Reeves',
                    born: 1964
                }
            }
        ],
        Movie: [
            {
                labels: ['Movie'],
                properties: {
                    title: 'The Matrix',
                    // tagLine: 'Welcome to the Real World',
                    released: 1999
                }
            }
        ]
    }

    let relsByType = {
        ACTED_IN: {
            type: 'ACTED_IN',
            startLabel: 'Person', 
            endLabel: 'Movie', 
            relsByIdentity: {
                rel1: {
                    identity: 'rel1',
                    type: 'ACTED_IN',
                    properties: {
                        roles: ['Neo']
                    }
                }
            }
        }
    }

    return { nodesByLabel, relsByType }
}

const getSampleDataModel = () => {
    var dataModel = DataModel();
    var personLabel = new dataModel.NodeLabel({ label: 'Person' });
    personLabel.display = new dataModel.NodeLabelDisplay({x: 100, y: 100})
    dataModel.addNodeLabel(personLabel);

    personLabel.addOrUpdateProperty({
        name: 'name',
        datatype: DataTypes.String
    }, { isPartOfKey: true });

    personLabel.addOrUpdateProperty({
        name: 'born',
        datatype: DataTypes.Integer
    }, { isPartOfKey: false });

    var movieLabel = new dataModel.NodeLabel({ label: 'Movie' });
    movieLabel.display = new dataModel.NodeLabelDisplay({x: 300, y: 300})
    dataModel.addNodeLabel(movieLabel);

    movieLabel.addOrUpdateProperty({
        name: 'title',
        datatype: DataTypes.String
    }, { isPartOfKey: true });

    movieLabel.addOrUpdateProperty({
        name: 'tagLine',
        datatype: DataTypes.String
    }, { isPartOfKey: false });

    movieLabel.addOrUpdateProperty({
        name: 'released',
        datatype: DataTypes.Integer
    }, { isPartOfKey: false });

    var actedInType = new dataModel.RelationshipType({
        type: 'ACTED_IN',
        startNodeLabel: personLabel,
        endNodeLabel: movieLabel
    });
    dataModel.addRelationshipType(actedInType);

    actedInType.addOrUpdateProperty({
        name: 'roles',
        datatype: DataTypes.StringArray
    });    

    var directedType = new dataModel.RelationshipType({
        type: 'DIRECTED',
        startNodeLabel: personLabel,
        endNodeLabel: movieLabel
    });
    dataModel.addRelationshipType(directedType);

    return dataModel;
}

// test('check sample data format', () => {
//     let { relsByType } = getSampleData();
//     Object.keys(relsByType).forEach(typeString => {
//         let { relsByIdentity } = relsByType[typeString];
//         console.log('typeString: ', typeString);
//         console.log('relsByIdentity: ', relsByIdentity);
//         let rels = Object.values(relsByIdentity)
//         expect(rels.length).toBe(1);
//     });    
// })

test('test makeDataModelFromData - empty user model', () => {

    let { nodesByLabel, relsByType } = getSampleData();

    let emptyModel = new DataModel();
    let dataModelFromDataNoUserModel = makeDataModelFromData({ 
        nodesByLabel, 
        relsByType, 
        userSpecifiedModel: emptyModel
    })

    // console.log(dataModelFromDataNoUserModel.toJSON(true));

    /* expect dataModelFromDataNoUserModel to have
        Person, Movie, ACTED_IN
        just the properties set
        to pick node keys for Person and Movie    
    */
    let personLabel = dataModelFromDataNoUserModel.getNodeLabelByLabel('Person');
    expect(personLabel).not.toBeNull();
    let nameProp = personLabel.getPropertyByName('name');
    expect(nameProp).not.toBeNull();
    expect(nameProp.datatype).toBe(DataTypes.String);
    expect(nameProp.isPartOfKey).toBe(false);

    let bornProp = personLabel.getPropertyByName('born');
    expect(bornProp).not.toBeNull();
    expect(bornProp.datatype).toBe(DataTypes.Integer);
    expect(bornProp.isPartOfKey).toBe(true);

    let movieLabel = dataModelFromDataNoUserModel.getNodeLabelByLabel('Movie');
    expect(movieLabel).not.toBeNull();
    let titleProp = movieLabel.getPropertyByName('title');
    expect(titleProp).not.toBeNull();
    expect(titleProp.datatype).toBe(DataTypes.String);
    expect(titleProp.isPartOfKey).toBe(false);

    let tagLineProp = movieLabel.getPropertyByName('tagLine');
    expect(tagLineProp).toBeNull(); // this one should be null, because it's commented out    

    let releasedProp = movieLabel.getPropertyByName('released');
    expect(releasedProp).not.toBeNull();
    expect(releasedProp.datatype).toBe(DataTypes.Integer);
    expect(releasedProp.isPartOfKey).toBe(true);

    // console.log(dataModelFromDataNoUserModel.getRelationshipTypeArray());
    let actedInType = dataModelFromDataNoUserModel.getRelationshipType('ACTED_IN', 'Person', 'Movie');
    expect(actedInType).not.toBeNull();
    let rolesProp = actedInType.getPropertyByName('roles');
    expect(rolesProp).not.toBeNull();
    expect(rolesProp.datatype).toBe(DataTypes.StringArray);

    // check default left-to-right dagre layout
    expect(personLabel.display.y).toEqual(movieLabel.display.y);
    expect(personLabel.display.x).toBeLessThan(movieLabel.display.x);

});

test('test makeDataModelFromData - user model specified', () => {
    let { nodesByLabel, relsByType } = getSampleData();

    let sampleDataModel = getSampleDataModel();
    let dataModelFromData = makeDataModelFromData({ 
        nodesByLabel, 
        relsByType, 
        userSpecifiedModel: sampleDataModel
    })

    /*
    expect dataModelFromData to:
        - drop DIRECTED relationship
        - drop tagLine property on Movie
        - make the node key for Person 'name'
        - make the node key for Movie 'title'
        - layout taken from provided model
    */
    let personLabel = dataModelFromData.getNodeLabelByLabel('Person');
    expect(personLabel).not.toBeNull();
    let nameProp = personLabel.getPropertyByName('name');
    expect(nameProp).not.toBeNull();
    expect(nameProp.datatype).toBe(DataTypes.String);

    let bornProp = personLabel.getPropertyByName('born');
    expect(bornProp).not.toBeNull();
    expect(bornProp.datatype).toBe(DataTypes.Integer);

    // ===================================
    // make the node key for Person 'name'
    // ===================================
    expect(bornProp.isPartOfKey).toBe(false);  
    expect(nameProp.isPartOfKey).toBe(true);   // because specified in user provider model

    let movieLabelFromGeneratedModel = dataModelFromData.getNodeLabelByLabel('Movie');
    expect(movieLabelFromGeneratedModel).not.toBeNull();
    let titleProp = movieLabelFromGeneratedModel.getPropertyByName('title');
    expect(titleProp).not.toBeNull();
    expect(titleProp.datatype).toBe(DataTypes.String);

    let releasedProp = movieLabelFromGeneratedModel.getPropertyByName('released');
    expect(releasedProp).not.toBeNull();
    expect(releasedProp.datatype).toBe(DataTypes.Integer);

    // ===================================
    // make the node key for Movie 'title'
    // ===================================
    expect(releasedProp.isPartOfKey).toBe(false);   
    expect(titleProp.isPartOfKey).toBe(true);       // because specified in user provided model

    // ================================
    // drop tagLine property on Movie
    // ================================
    let movieLabelFromUserModel = sampleDataModel.getNodeLabelByLabel('Movie');
    let tagLinePropSample = movieLabelFromUserModel.getPropertyByName('tagLine');
    expect(tagLinePropSample).not.toBeNull(); // this one should not be null, because we specified it in the model

    let tagLinePropGenerated = movieLabelFromGeneratedModel.getPropertyByName('tagLine');
    // this one should be null, because even though it's in the provided model, its not present in the data
    expect(tagLinePropGenerated).toBeNull(); 
    
    // check rels
    let actedInType = dataModelFromData.getRelationshipType('ACTED_IN', 'Person', 'Movie');
    expect(actedInType).not.toBeNull();
    let rolesProp = actedInType.getPropertyByName('roles');
    expect(rolesProp).not.toBeNull();
    expect(rolesProp.datatype).toBe(DataTypes.StringArray);

    // ================================
    // drop DIRECTED relationship
    // ================================
    let directedTypeFromUserModel = sampleDataModel.getRelationshipType('DIRECTED', 'Person', 'Movie');
    expect(directedTypeFromUserModel).not.toBeNull();

    let directedTypeFromGeneratedModel = dataModelFromData.getRelationshipType('DIRECTED', 'Person', 'Movie');
    expect(directedTypeFromGeneratedModel).toBeNull();

    // ================================
    // layout taken from provided model
    // ================================
    let personLabelFromUserModel = sampleDataModel.getNodeLabelByLabel('Person');
    expect(personLabel.display.x).toEqual(personLabelFromUserModel.display.x);
    expect(personLabel.display.y).toEqual(personLabelFromUserModel.display.y);
    expect(movieLabelFromGeneratedModel.display.x).toEqual(movieLabelFromUserModel.display.x);
    expect(movieLabelFromGeneratedModel.display.y).toEqual(movieLabelFromUserModel.display.y);

});

