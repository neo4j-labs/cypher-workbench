// import uuidv4 from 'uuid/v4';
import chroma from 'chroma-js';
import JaroWrinker from './JaroWrinker';
import { getConstraintStatementsEx } from './dataModelExtension';
import { smartQuote } from './helper';
import DataTypes from './DataTypes';
var dataModelCounter = 1;

export const DataChangeType = {
    AddOrUpdateSecondaryNodeLabel: "AddOrUpdateSecondaryNodeLabel",
    AddOrUpdateNodeLabel: "AddOrUpdateNodeLabel",
    AddRelationshipType: "AddRelationshipType",
    UpdateRelationshipType: "UpdateRelationshipType",
    AddOrUpdateProperty: "AddOrUpdateProperty",
    AddOrUpdateDataSource: "AddOrUpdateDataSource",
    RemoveNodeLabel: "RemoveNodeLabel",
    RemoveRelationshipType: "RemoveRelationshipType",
    RemoveProperty: "RemoveProperty",
    RemoveDataSource: "RemoveDataSource",
    NodeLabelDisplayUpdate: "NodeLabelDisplayUpdate",
    CanvasTransformUpdate: "CanvasTransformUpdate",
    DataModelPropertyChange: "DataModelPropertyChange"
}

export const LLMString = {
    JustNodeLabel: "JustNodeLabel",
    NodeLabelAndProperties: "NodeLabelAndProperties"
}

export const ArrowsCypher = {
    JustVariable: "JustVariable",
    VariableAndNodeLabels: "VariableAndNodeLabels",
    VariableNodeLabelsAndProperties: "VariableNodeLabelsAndProperties"
}

export const CypherType = {
    Create: "Create",
    Merge: "Merge",
    Match: "Match"
}

export default function DataModel () {

    var dataModelInstanceNumber = dataModelCounter;
    dataModelCounter++;

    var nodeLabels = {};
    var relationshipTypes = {};
    var propertyDefinitions = {};
    var dataSources = {};
    var generatedKeys = {}; // helper object to prevent generating same keys during a session

    // we will store validation preferences with data model
    var excludeValidationSections = [];

    var deletedNodeLabelKeysSinceLastSave = [];
    var deletedRelationshipTypeKeysSinceLastSave = [];
    var deletedDataSourceKeysSinceLastSave = [];

    var isRemotelyPersisted = false;
    //var relationshipIdCounter = 0;

    const NEW_NODE_LABEL_KEY_PREFIX = "Node";
    const NEW_RELATIONSHIP_TYPE_KEY_PREFIX = "Rel";
    const NEW_PROPERTY_DEFINITION_KEY_PREFIX = "Prop";
    const ID_JOINER = '_cwid_';

    var KEY_START = 0;
    var KEY_MAX = 100000;

    var CypherOrigin = {
        CreateMerge: "CreateMerge",
        Match: "Match",
        Both: "Both",
        Database: "Database"
    }

    function setNodeLabelCypherOriginDisplay (display, properties) {

        /*
        if (display && properties && properties.cypherOrigin) {
            if (properties.cypherOrigin === CypherOrigin.Match) {
                display.color = "lightgray";
                display.stroke = "gray";
                display.strokeDashArray = "6,6";
            } else if (properties.cypherOrigin === CypherOrigin.CreateMerge) {
                display.color = "lightgray";
                display.stroke = "gray";
                delete display.strokeDashArray;
            } else if (properties.cypherOrigin === CypherOrigin.Both) {
                display.color = "lightgreen";
                display.stroke = "green";
                delete display.strokeDashArray;
            } else if (properties.cypherOrigin === CypherOrigin.Database) {
                display.color = "lightgreen";
                display.stroke = "green";
                delete display.strokeDashArray;
            }
        }
        */

        /*
        display.color = "lightgreen";
        display.stroke = "green";
        */
    }

    function setRelationshipTypeCypherOriginDisplay (display, properties) {
        /*
        if (display && properties && properties.cypherOrigin) {
            if (properties.cypherOrigin === CypherOrigin.Match) {
                display.color = "lightgray";
                display.strokeDashArray = "5,5";
            } else if (properties.cypherOrigin === CypherOrigin.CreateMerge) {
                display.color = "lightgray";
                delete display.strokeDashArray;
            } else if (properties.cypherOrigin === CypherOrigin.Both) {
                display.color = "black";
                delete display.strokeDashArray;
            } else if (properties.cypherOrigin === CypherOrigin.Database) {
                display.color = "black";
                delete display.strokeDashArray;
            }
        }*/
        /*
        display.color = "black";
        */
    }

    function getAllCompositeIndexNames () {
        return getNodeLabelArray()
            .map(nodeLabel => nodeLabel.getIndexes())
            .reduce((acc, indexArray) => acc.concat(indexArray), [])
            .map(index => index.indexName)
            .filter(indexName => indexName);    // get rid of nulls and blanks
    }

    const addValidationSectionToExclude = (sectionKey) => {
        if (!excludeValidationSections.includes(sectionKey)) {
            excludeValidationSections.push(sectionKey);
            dataChanged(DataChangeType.DataModelPropertyChange, {});
        }
    }

    const removeValidationSectionToExclude = (sectionKey) => {
        var index = excludeValidationSections.indexOf(sectionKey);
        if (index >= 0) {
            excludeValidationSections.splice(index,1);
            dataChanged(DataChangeType.DataModelPropertyChange, {});
        }
    }

    const getExcludeValidationSections = () => excludeValidationSections.slice();

    function Glyph (properties) {
        properties = properties || {};
        this.orientation = properties.orientation;
        this.color = properties.color || '';
        this.text = properties.text || '';
        this.textColor = properties.textColor || 'white';
        this.icon = properties.icon;
    }

    function NodeLabelDisplay (properties) {
        this.color = (properties && properties.color) ? properties.color : "white";
        this.stroke = (properties && properties.stroke) ? properties.stroke : "black";
        this.strokeWidth = (properties && properties.strokeWidth) ? properties.strokeWidth : 4;

        setNodeLabelCypherOriginDisplay(this, properties);

        this.x = (properties && properties.x !== undefined) ? properties.x : 200;   // TODO: get these defaults from somewhere else
        this.y = (properties && properties.y !== undefined) ? properties.y : 100;
        this.radius = (properties && properties.radius) ? properties.radius : 40;
        this.size = (properties && properties.size) ? properties.size: 'md';
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.fontSize = (properties && properties.fontSize) ? properties.fontSize: 14;
        //this.fontSize = 14;
        this.fontColor = (properties && properties.fontColor) ? properties.fontColor : 'black';
        this.textLocation = (properties && properties.textLocation) ? properties.textLocation : "middle";  // middle or below
        this.isLocked = (properties && properties.isLocked) ? properties.isLocked : false;

        /* for testing */
        /*
        var glyph1 = new Glyph({
            orientation: 'left',
            text: '',
            color: 'white',
            textColor: 'green',
            //textColor: 'orange',
            icon: 'check-circle'
            //icon: 'exclamation-triangle'
        })

        var glyph2 = new Glyph({
            orientation: 'right',
            text: 'Abc',
            //color: '#C82266',
            color: 'green',
            textColor: 'white'
        })
        this.glyphs = [glyph1, glyph2];
        */
        this.glyphs = [];

        this.addGlyph = (properties) => {
            const newGlyph = new Glyph(properties);
            this.glyphs.push(newGlyph);
        }
        this.removeGlyph = (orientation) => {
            var index = this.glyphs.findIndex(x => x.orientation === orientation);
            if (index >= 0) {
                this.glyphs.splice(index,1);
            }
        }
        this.removeAllGlyphs = () => this.glyphs = [];
        this.getGlyphs = () => this.glyphs;

        this.setColor = (hexColor) => {
            this.color = hexColor;
            hexColor = (hexColor && hexColor.toLowerCase) ? hexColor.toLowerCase() : hexColor;
            if (hexColor == '#000000' || hexColor == '#ffffff') {
                this.stroke = 'black';
            } else {
                this.stroke = chroma(hexColor).darken(1.6).hex();
            }
            //console.log('this.stroke: ' + this.stroke);
            var luminance = chroma(hexColor).luminance();
            if (luminance <= 0.45) {
                this.fontColor = 'white';
            } else {
                this.fontColor = 'black';
            }
            //console.log('luminance: ' + luminance);
            //console.log('this.fontColor: ' + this.fontColor);
        };

        this.getColor = () => this.color;
        this.getFontColor = () => this.fontColor;

        this.setSize = (size) => {
            switch (size) {
                case 'x_sm':
                    this.radius = 14;
                    break;
                case 'sm':
                    this.radius = 28;
                    break;
                case 'md':
                    this.radius = 40;
                    break;
                case 'lg':
                    this.radius = 60;
                    break;
                case 'x_lg':
                    this.radius = 80;
                    break;
            }
            this.size = size;
            this.width = this.radius * 2;
            this.height = this.radius * 2;
        }

        this.setSize(this.size);
    }

    function RelationshipTypeDisplay (properties) {
        this.color = (properties && properties.color) ? properties.color : "black";

        setRelationshipTypeCypherOriginDisplay (this, properties);

        this.fontSize = (properties && properties.fontSize) ? properties.fontSize: 14;
        //this.fontSize = 16;
        this.strokeWidth = (properties && properties.strokeWidth) ? properties.strokeWidth : 3;
        this.offset = (properties && properties.offset) ? properties.offset : 0;

        this.glyph = null;
        /*
        this.glyph = new Glyph({
            text: '',
            color: 'white',
            textColor: 'green',
            icon: 'check-circle'
        })*/
        this.setGlyph = (properties) => {
            if (properties) {
                this.glyph = new Glyph(properties);
            } else {
                this.glyph = null;
            }
        }

        this.getColor = () => this.color;
        this.getFontColor = () => this.color;
    }

    function DataSource (properties) {
        this.classType = "DataSource";   /* because d3 will make a copy and destroy the original type */
        this.withHeaders = (properties) ? properties.withHeaders : false;
        this.fromExpression = (properties) ? properties.fromExpression : null;
        this.variable = (properties) ? properties.variable : null;
        this.fieldTerminator = (properties) ? properties.fieldTerminator : null;
        this.dataChangedSinceLastSave = (properties && typeof(properties.dataChangedSinceLastSave) === 'boolean') ? properties.dataChangedSinceLastSave : false;
        this.dataChangeTimestamp = (properties && typeof(properties.dataChangeTimestamp) === 'number') ? properties.dataChangeTimestamp : undefined;

        this.key = (properties) ? properties.key : null;
        if (!this.key && this.fromExpression && this.fromExpression.replace) {
            this.key = this.fromExpression.replace(/[:/.]/g, '_');
        } else {
            console.log('could not set key in DataSource, this.fromExpression = ', this.fromExpression);
        }

        this.resetDataChangeFlags = (timestamp) => {
            if (this.dataChangeTimestamp < timestamp) {
                this.dataChangedSinceLastSave = false;
            }
        }

        /*
        this.display = (properties) ? properties.display : null;
        if (!this.display) {
            this.display = new NodeLabelDisplay();
        }*/
    }

    function Constraint (properties) {
        this.propertyName = (properties) ? properties.name : null;
        this.assertPropertyIsUnique = (properties) ? properties.assertPropertyUnique : null;
        this.assertPropertyExists = (properties) ? properties.assertPropertyExists : null;
    }

    function getNewPropertyDefinition () {
        return new PropertyDefinition({
            name: '',
            datatype: '',
            referenceData: '',
            isPartOfKey: false,
            isIndexed: false,
            isArray: false,
            hasUniqueConstraint: false,
            mustExist: false
        });
    }

    function PropertyDefinition (properties) {
        //this.uuidKey = (properties && properties.uuidKey) ? properties.uuidKey : uuidv4();
        this.key = (properties && properties.key) ? properties.key : null;
        if (!this.key) {
            //relationshipIdCounter++;
            this.key = getNewKey(NEW_PROPERTY_DEFINITION_KEY_PREFIX);
        }

        this.name = (properties && properties.name) ? properties.name : null;
        this.datatype = (properties && properties.datatype) ? properties.datatype : DataTypes.String;
        /* referenceData can be an example field value or the source of the value from an update statement
              e.g. in a statement such as:
                MERGE (x:MyLabel {myprop: row.my_header })
                this.name = 'myprop'
                this.referenceData = 'row.my_header'
         */
        this.referenceData = (properties && properties.referenceData) ? properties.referenceData : null;
        this.description = (properties && properties.description) ? properties.description : null;
        this.fromDataSources = (properties && properties.fromDataSources) ? properties.fromDataSources : [];
        this.isPartOfKey = (properties && typeof(properties.isPartOfKey) === 'boolean') ? properties.isPartOfKey : false;
        this.isArray = (properties && typeof(properties.isArray) === 'boolean') ? properties.isArray : false;
        this.isIndexed = (properties && typeof(properties.isIndexed) === 'boolean') ? properties.isIndexed : false;
        this.mustExist = (properties && typeof(properties.mustExist) === 'boolean') ? properties.mustExist : false;
        this.hasUniqueConstraint = (properties && typeof(properties.hasUniqueConstraint) === 'boolean') ? properties.hasUniqueConstraint : false;

        this.dataChangedSinceLastSave = (properties && typeof(properties.dataChangedSinceLastSave) === 'boolean') ? properties.dataChangedSinceLastSave : false;
        //console.log('FOO: this.dataChangedSinceLastSave: ', this.dataChangedSinceLastSave);
        this.dataChangeTimestamp = (properties && typeof(properties.dataChangeTimestamp) === 'number') ? properties.dataChangeTimestamp : undefined;

        this.addDataSource = function (dataSource) {
            if (dataSource) {
                if (!this.fromDataSources) {
                    this.fromDataSources = [];
                }
                if (this.fromDataSources.indexOf(dataSource) == -1) {
                    this.fromDataSources.push(dataSource);
                }
            }
        }

        this.getString = function () {
            return this.name + ":" + this.datatype;
        }

        this.getStringWithReferenceData = function () {
            var refString = (this.referenceData) ? ' (' + this.referenceData + ')' : '';
            return this.name + " : " + this.datatype + refString;
        }

        this.getCypherMatchSnippet = function (variable) {
            var id = this.name + '_' + this.datatype;
            var cypher = "MATCH (" + variable + ":_NS_PropertyDefinition {id:'" + id + "'})";
            return cypher;
        }

        this.getCypherPersistenceStatement = function () {
            var id = this.name + '_' + this.datatype;
            var cypher = "MERGE (pd:_NS_PropertyDefinition {id:'" + id + "'})";
            cypher += "\nSET pd += {name:'" + this.name + "', "
                    + "\ndatatype:'" + this.datatype + "'};";
            return cypher;
        }

        this.getLLMStyleString = function () {
            var cypher = (this.datatype) ? `${smartQuote(this.name)}:'${this.datatype}'` : smartQuote(this.name);
            return cypher;
        }

        this.getArrowsStyleCypher = function () {
            var value;
            if (this.referenceData) {
                value = this.referenceData;
                switch (this.datatype) {
                    case DataTypes.List:
                    case DataTypes.Map:
                        value = JSON.stringify(value);
                        break;
                    case DataTypes.String:
                        value = "'" + value + "'";
                        break;
                    case DataTypes.Boolean:
                    case DataTypes.Float:
                    case DataTypes.Integer:
                        // nothing to do
                        break;
                    default:
                        break;
                }
            } else {
                value = "'" + this.datatype + "'";
            }
            var cypher = (value) ? smartQuote(this.name) + ':' + value : smartQuote(this.name);
            return cypher;
        }

        this.matchesPropertyDefinition = function (propDef) {
            return (this.name === propDef.name
            && this.datatype === propDef.datatype
            && this.referenceData === propDef.referenceData
            && this.isPartOfKey === propDef.isPartOfKey
            && this.isIndexed === propDef.isIndexed
            && this.isArray === propDef.isArray
            && this.hasUniqueConstraint === propDef.hasUniqueConstraint
            && this.mustExist === propDef.mustExist);
        }
    }

    function getNewKey (prefix) {
        var keySpaceMap;
        switch (prefix) {
            case NEW_NODE_LABEL_KEY_PREFIX:
                keySpaceMap = nodeLabels;
                break;
            case NEW_RELATIONSHIP_TYPE_KEY_PREFIX:
                keySpaceMap = relationshipTypes;
                break;
            case NEW_PROPERTY_DEFINITION_KEY_PREFIX:
                keySpaceMap = propertyDefinitions;
                break;
        }
        for (var i = KEY_START; i < KEY_MAX; i++) {
            var candidateKey = prefix + i;
            if (!keySpaceMap[candidateKey] && !generatedKeys[candidateKey]) {
                generatedKeys[candidateKey] = candidateKey;
                KEY_START = i;
                return candidateKey;
            }
        }
        throw new Error("Could not get new node label key, id search space has been exhausted.");
    }

    function getPropertiesString (item) {
        var propertyString = '';
        if (item.properties !== null) {
            Object.values(item.properties).map(property => {
                if (propertyString) {
                    propertyString += ', ';
                }
                propertyString += property.getString();
            });
        }
        return propertyString;
    }

    function getPropertiesStringWithReferenceData (item) {
        var propertyString = '';
        if (item && item.properties) {
            var properties = Object.values(item.properties);
            // sort primary keys first, then alphabetic
            properties.sort((a,b) => {
                if (a.isPartOfKey === b.isPartOfKey) {
                    if (a.name === b.name) {
                        return 0;
                    } else {
                        return (a.name > b.name) ? 1 : -1;
                    }
                } else {
                    return (a.isPartOfKey) ? -1 : 1;
                }
            });
            //console.log('sorted properties: ' + JSON.stringify(properties));

            var propStrings = properties.map(property => {
                var str = property.getStringWithReferenceData();
                if (property.isPartOfKey) {
                    str = (property.isPartOfKey) ? "(*) " + str : str;
                } else if (property.mustExist) {

                }

                return str;
            })
            propertyString = propStrings.join('\n');
        }
        return propertyString;
    }
    /*
    function Node (properties) {
        this.classType = "Node";
        this.nodeId = (properties) ? properties.nodeId: -1;
        this.labels = (properties) ? properties.labels : [];
        this.properties = (properties) ? properties.properties : {};
        this.returnVariable = (properties) ? properties.returnVariable: null;

        this.display = (properties) ? properties.display : null;
        if (!this.display) {
            this.display = new NodeLabelDisplay();
        }
    }*/

    function setCypherOrigin (obj, properties) {
        if (obj && properties) {
            if (obj.cypherOrigin !== CypherOrigin.Both) {
                if (obj.cypherOrigin === CypherOrigin.CreateMerge &&
                    properties.cypherOrigin === CypherOrigin.Match) {
                        obj.cypherOrigin = CypherOrigin.Both;
                } else if (obj.cypherOrigin === CypherOrigin.Match &&
                    properties.cypherOrigin === CypherOrigin.CreateMerge) {
                        obj.cypherOrigin = CypherOrigin.Both;
                } else if (properties.cypherOrigin) {
                    obj.cypherOrigin = properties.cypherOrigin;
                }
            }
        }
    }

    function NodeLabel (properties) {
        this.classType = "NodeLabel";   /* because d3 will make a copy and destroy the original type */
        /* label value must be unique within model */
        this.label = (properties && typeof(properties.label) === 'string') ? properties.label : null;
        this.getText = () => this.label;
        this.setText = (newText) => {
            if (newText !== this.label) {
                this.label = newText;
                dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
            }
        }

        this.fromDataSources = (properties && properties.fromDataSources) ? properties.fromDataSources : [];

        this.key = (properties && properties.key) ? properties.key : null;
        if (!this.key) {
            this.key = getNewKey(NEW_NODE_LABEL_KEY_PREFIX);
        }

        /* constraints that apply to this node label */
        //this.constraints = (properties && properties.constraints) ? properties.constraints : [];

        /* indexed properties */
        //this.indexedProperties = (properties && properties.indexedProperties) ? properties.indexedProperties : [];
        this.indexes = (properties && properties.indexes) ? properties.indexes : [];

        /* allowed properties */
        this.properties = (properties && properties.properties) ? properties.properties : {};

        /* NEW pseudo-properties */
        this.secondaryNodeLabelKeys = [];
        this.isOnlySecondaryNodeLabel = false;
        /* end pseudo-properties */

        this.description = (properties && properties.description) ? properties.description : null;

        /* reference data to display, similar to Arrows */
        //this.referenceData = (properties && properties.referenceData) ? properties.referenceData : {};

        // we have co-opted referenceData is a placeholder for pseudo-properties
        this.getReferenceData = () => {
            return {
                referenceData: this.referenceData,
                secondaryNodeLabelKeys: this.secondaryNodeLabelKeys,
                isOnlySecondaryNodeLabel: this.isOnlySecondaryNodeLabel
            }
        }

        this.setReferenceData = (referenceData) => {
            if (typeof(referenceData) === 'string') {
                try {
                    referenceData = JSON.parse(referenceData);
                } catch (e) {
                    console.log(`Expected referenceData '${referenceData}' to be a JSON string`, e);
                }
            }
            this.referenceData = referenceData.referenceData;
            //console.log('label "' + this.label + '" setting secondaryNodeLabelKeys: ', referenceData.secondaryNodeLabelKeys);
            this.secondaryNodeLabelKeys = (referenceData.secondaryNodeLabelKeys) ? referenceData.secondaryNodeLabelKeys : [];
            this.isOnlySecondaryNodeLabel = (referenceData.isOnlySecondaryNodeLabel) ? true : false;
        }

        this.addIndex = (index, dontNotify) => {
            /* indexes have the format
            var newIndex = {
                indexName: indexName,
                propertyDefinitionKeys: [propertyDefinition1.key, propertyDefinition2.key, ...]
            }
            */
            var position = this.indexes.indexOf(index);
            if (position === -1) {
                this.indexes.push(index);
                if (!dontNotify) {
                    dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
                }
            }
        }

        this.removeIndex = (index, dontNotify) => {
            var position = this.indexes.indexOf(index);
            if (position >= 0) {
                this.indexes.splice(position,1);
                if (!dontNotify) {
                    dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
                }
            }
        }

        this.getIndexes = () => this.indexes.slice();

        this.updateIndexes = () => {
            var propertyDefinitionKeys = Object.keys(this.properties);
            var indexesToUpdate = this.indexes
                    .filter(index => {
                        var missingKey = index.propertyDefinitionKeys.find(key => !propertyDefinitionKeys.includes(key));
                        return (missingKey) ? true : false;
                    });
            if (indexesToUpdate.length > 0) {
                indexesToUpdate.map(indexToUpdate => {
                    indexToUpdate.propertyDefinitionKeys = 
                        indexToUpdate.propertyDefinitionKeys.filter(key => propertyDefinitionKeys.includes(key));
                });
                
                for (var i = 0; i < this.indexes.length; i++) {
                    var index = this.indexes[i];
                    if (index.propertyDefinitionKeys.length < 2) {
                        this.indexes.splice(i,1);
                        i--;
                    }
                }

                dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
            }
        }

        this.setIsOnlySecondaryNodeLabel = (isOnlySecondaryNodeLabel, dontNotify) => {
            this.isOnlySecondaryNodeLabel = isOnlySecondaryNodeLabel;
            if (!dontNotify) {
                dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
            }
        }

        var referenceDataObject = (properties && properties.referenceData) ? properties.referenceData : {};
        this.setReferenceData(referenceDataObject);

        /*
        this.isInstance = false;
        this.isPattern = false;
        this.referenceLinkToOtherModel;
        this.secondaryNodeLabels = [];        
        this.description;
        */

        this.removedPropertyKeysSinceLastSave = (properties && Array.isArray(properties.removedPropertyKeysSinceLastSave)) ? properties.removedPropertyKeysSinceLastSave : [];
        this.dataChangedSinceLastSave = (properties && typeof(properties.dataChangedSinceLastSave) === 'boolean') ? properties.dataChangedSinceLastSave : false;
        this.dataChangeTimestamp = (properties && typeof(properties.dataChangeTimestamp) === 'number') ? properties.dataChangeTimestamp : undefined;
        this.displayChangedSinceLastSave = (properties && typeof(properties.displayChangedSinceLastSave) === 'boolean') ? properties.displayChangedSinceLastSave : false;
        this.displayChangeTimestamp = (properties && typeof(properties.displayChangeTimestamp) === 'number') ? properties.displayChangeTimestamp : undefined;

        setCypherOrigin(this, properties);

        this.display = (properties) ? properties.display : null;
        if (!this.display) {
            this.display = new NodeLabelDisplay({
                cypherOrigin: this.cypherOrigin
            });
        }

        this.getNumberOfProperties = () => {
            var props = this.properties || {};
            return Object.keys(props).length;
        }

        this.resetDataChangeFlags = (timestamp) => resetPropertyContainerDataChangeFlags(this, timestamp);
        this.getChangedProperties = () => getChangedProperties(this);
        this.getRemovedPropertyKeysSinceLastSave = () => this.removedPropertyKeysSinceLastSave.slice(0)
                                                                                    .map(x => x.changedKey);
        this.addOrUpdateProperty = (propertyMap, booleanFlags) =>
                    addOrUpdateProperty(this, propertyMap, booleanFlags);
        this.addProperty = (propertyMap, booleanFlags, dontNotify) =>
                    addProperty(this, propertyMap, booleanFlags, dontNotify);
        this.getPropertyByName = (name) => getPropertyByName(this, name);
        this.removeProperty = (key) => {
            removeProperty(this, key);
            this.updateIndexes();
        }
        this.setSize = (size) => setSize(this, size);
        this.setColor = (hexColor) => setColor(this, hexColor);

        this.getColor = () => this.display.getColor();
        this.getFontColor = () => this.display.getFontColor();

        this.update = (obj) => {
            if ('label' in obj) {
                this.label = obj.label;
            }
            if ('description' in obj) {
                this.description = obj.description;
            }
            dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
        }

        /* new stuff */
        this.getSecondaryData = () => 
            this.secondaryNodeLabelKeys
                .map(nodeLabelKey => getNodeLabelByKey(nodeLabelKey))
                .filter(x => x);    // filter out any keys which may have been deleted

        this.addSecondaryNodeLabelKey = (secondaryNodeLabelKey) => {
            if (!this.secondaryNodeLabelKeys.includes(secondaryNodeLabelKey)) {
                this.secondaryNodeLabelKeys.push(secondaryNodeLabelKey);
                dataChanged(DataChangeType.AddOrUpdateSecondaryNodeLabel, { changedObject: this });
            }
        }

        this.removeSecondaryNodeLabelKey = (secondaryNodeLabelKey) => {
            if (this.secondaryNodeLabelKeys.includes(secondaryNodeLabelKey)) {
                this.secondaryNodeLabelKeys.splice(this.secondaryNodeLabelKeys.indexOf(secondaryNodeLabelKey),1);
                dataChanged(DataChangeType.AddOrUpdateSecondaryNodeLabel, { changedObject: this });
            }
        }

        this.clearSecondaryNodeLabelKeys = () => {
            this.secondaryNodeLabelKeys = [];
            dataChanged(DataChangeType.AddOrUpdateSecondaryNodeLabel, { changedObject: this });
        }

        this.getTextWithSecondaryNodeLabels = () => {
            var secondaryDataTextArray = this.getSecondaryData().map(x => x.getText());
            var textArray = [this.getText()].concat(secondaryDataTextArray);
            var text = textArray.join(':');
            //console.log("getTextWithSecondaryNodeLabels: " + text);
            return text;
        }
        /* end new stuff */

        this.setCypherOrigin = function (cypherOrigin) {
            setCypherOrigin(this, { cypherOrigin: cypherOrigin });
            setNodeLabelCypherOriginDisplay(this.display, { cypherOrigin: this.cypherOrigin });
        }

        this.addDataSource = function (dataSource, dontNotify) {
            if (dataSource) {
                if (!this.fromDataSources) {
                    this.fromDataSources = [];
                }
                if (this.fromDataSources.indexOf(dataSource) == -1) {
                    this.fromDataSources.push(dataSource);
                    if (!dontNotify) {
                        dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: this });
                    }
                }
            }
        }

        this.getPropertiesString = function () {
            return getPropertiesString(this);
        }

        this.getPropertiesStringWithReferenceData = function () {
            return getPropertiesStringWithReferenceData(this);
        }

        this.getCypherMatchSnippet = function (variable) {
            var id = this.key;
            var cypher = "MATCH (" + variable + ":_NS_NodeLabel {id:'" + id + "'})";
            return cypher;
        }

        this.getNodeLabelPersistenceStatement = function () {
            var id = this.key;
            var cypher = '';
            cypher += "\nMERGE (nl:_NS_NodeLabel {id:'" + id + "'})";
            cypher += "\nSET nl += {label:'" + this.label + "', "
                    + "\nclassType:'" + this.classType + "'}";

            var withAdded = false;
            var variableCounter = 1;
            Object.values(this.properties).map(property => {
                if (!withAdded) {
                    cypher += '\nWITH nl';
                    withAdded = true;
                }
                var propVariable = 'pd_' + variableCounter;
                variableCounter++;
                cypher += '\n' + property.getCypherMatchSnippet(propVariable);
            })

            // TODO: constraints, indexedProperties, referenceData, display
            variableCounter = 1;
            Object.values(this.properties).map(property => {
                var propVariable = 'pd_' + variableCounter;
                variableCounter++;
                cypher += '\nMERGE (nl)-[:_NS_HAS_PROPERTY]->(' + propVariable + ')';
            })
            cypher += ';';
            return cypher;
        }

        this.getCypherPersistenceStatements = function () {
            var cypherStatements = [];
            Object.values(this.properties).map(property => cypherStatements.push(property.getCypherPersistenceStatement()));
            cypherStatements.push(this.getNodeLabelPersistenceStatement());
            return cypherStatements;
        }

        this.getCypherPersistenceStatement = function () {
            var cypher = '';
            Object.values(this.properties).map(property => cypher += '\n' + property.getCypherPersistenceStatement());
            cypher += '\n';
            cypher += this.getNodeLabelPersistenceStatement();
            return cypher;
        }

        this.getLLMStyleString = function (options, dataModel) {
            options = options || {};
            var propertyCypher = '';
            if (options.nodeLabel === LLMString.NodeLabelAndProperties) {
                if (this.properties && Object.keys(this.properties).length > 0) {
                    var propertyCypherArray = Object.values(this.properties).map(property => property.getLLMStyleString());
                    propertyCypher = '[' + propertyCypherArray.join(',') + ']';
                }
            }
            var nodeLabels = [this.label];
            if (dataModel && this.secondaryNodeLabelKeys.length > 0) {
                this.secondaryNodeLabelKeys.map(key => {
                    var nodeLabel = dataModel.getNodeLabelByKey(key);
                    if (nodeLabel) {
                        nodeLabels.push(nodeLabel.label);
                    }
                })
            } 
            var nodeLabelStrings = nodeLabels.map(x => smartQuote(x));
            let cypher = '';
            if (options.nodeLabel === LLMString.JustNodeLabel) {
                cypher = `:${nodeLabelStrings.join(':')}`;
            } else {
                cypher = `(:${nodeLabelStrings.join(':')}): ${propertyCypher}`;
            }
            return cypher;
        }

        this.getArrowsStyleCypher = function (variableAssignmentMap, options, dataModel) {
            if (variableAssignmentMap[this.key] === undefined || variableAssignmentMap[this.key] === null) {
                var variables = Object.values(variableAssignmentMap).sort(function(a, b) { return (a-b) });
                var nextVariable = (variables.length) ? variables[variables.length - 1] + 1 : 0;
                variableAssignmentMap[this.key] = nextVariable;
            }

            if (options === ArrowsCypher.JustVariable) {
                return '(`' + variableAssignmentMap[this.key] + '`)';
            } else if (options === ArrowsCypher.VariableAndNodeLabels) {
                var propertyCypher = '';
                var nodeLabels = [this.label];
                if (dataModel && this.secondaryNodeLabelKeys.length > 0) {
                    this.secondaryNodeLabelKeys.map(key => {
                        var nodeLabel = dataModel.getNodeLabelByKey(key);
                        if (nodeLabel) {
                            nodeLabels.push(nodeLabel.label);
                        }
                    })
                } 
                var nodeLabelStrings = nodeLabels.map(x => smartQuote(x));
            
                var cypher = '  (`' + variableAssignmentMap[this.key] + '` :' + nodeLabelStrings.join(':') + ')';
                return cypher;
            } else {
                var propertyCypher = '';
                if (this.properties && Object.keys(this.properties).length > 0) {
                    var propertyCypherArray = Object.values(this.properties).map(property => property.getArrowsStyleCypher());
                    propertyCypher = '{' + propertyCypherArray.join(',') + '}';
                }
                var nodeLabels = [this.label];
                if (dataModel && this.secondaryNodeLabelKeys.length > 0) {
                    this.secondaryNodeLabelKeys.map(key => {
                        var nodeLabel = dataModel.getNodeLabelByKey(key);
                        if (nodeLabel) {
                            nodeLabels.push(nodeLabel.label);
                        }
                    })
                } 
                var nodeLabelStrings = nodeLabels.map(x => smartQuote(x));
            
                var cypher = '  (`' + variableAssignmentMap[this.key] + '` :' + nodeLabelStrings.join(':') + ' ' + propertyCypher + ')';
                return cypher;
            }
        }
    }

    /*
    function Relationship (properties) {
        this.classType = "Relationship";
        this.key = (properties) ? properties.key : null;
        this.type = (properties) ? properties.type : null;
        this.startNodeId = (properties) ? properties.startNodeId : -1;
        this.endNodeId = (properties) ? properties.endNodeId : -1;
        this.properties = (properties) ? properties.properties : {};

        this.returnVariable = (properties) ? properties.returnVariable: null;

        this.display = (properties) ? properties.display : null;

        if (!this.display) {
            this.display = new RelationshipTypeDisplay();
        }
    }*/

    function RelationshipType (properties) {
        this.classType = "RelationshipType"; /* because d3 will make a copy and destroy the original type */
        this.key = (properties && properties.key) ? properties.key : null;
        this.type = (properties && properties.type) ? properties.type : null;
        this.getText = () => this.type;
        this.setText = (newText) => {
            if (newText !== this.type) {
                this.type = newText;
                dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }
        
        this.startNodeLabel = (properties && properties.startNodeLabel) ? properties.startNodeLabel : null;
        this.endNodeLabel = (properties && properties.endNodeLabel) ? properties.endNodeLabel : null;
        this.fromDataSources = (properties && properties.fromDataSources) ? properties.fromDataSources : [];

        if (!this.key) {
            //relationshipIdCounter++;
            this.key = getNewKey(NEW_RELATIONSHIP_TYPE_KEY_PREFIX);
        }

        /* cardinality examples */
        /* USState 1..1 -HAS_GOVERNOR-> 1..1 Governor */
        /* Mother 1..1 -HAS_CHILD-> 1..many Child     */
        /* Person 0..many -KNOWS-> 0..many Person     */
        /* Product 0..many -HAS_CATEGORY-> 0..1 Category  */
           /* how to say in English */
           /* A Product HAS_CATEGORY 0 or 1 Category */
           /* A Category has 0 to many Product(s), via HAS_CATEGORY */
        /* the minimum number of endNodeLabels instances for a single startNodeLabel instance */
        this.outMinCardinality = (properties && properties.outMinCardinality) ? properties.outMinCardinality : '0';
        /* the maximum number of endNodeLabels instances for a single startNodeLabel instance, 'many' = no limit */
        this.outMaxCardinality = (properties && properties.outMaxCardinality) ? properties.outMaxCardinality : 'many';
        /* the minimum number of startNodeLabels instances for a single endNodeLabel instance */
        this.inMinCardinality = (properties && properties.inMinCardinality) ? properties.inMinCardinality : '0';
        /* the maximum number of startNodeLabels instances for a single endNodeLabel instance, 'many' = no limit */
        this.inMaxCardinality = (properties && properties.inMaxCardinality) ? properties.inMaxCardinality : 'many';

        /* constraints that apply to this relationship type */
        //this.constraints = (properties && properties.constraints) ? properties.constraints : [];

        /* allowed properties */
        this.properties = (properties && properties.properties) ? properties.properties : {};

        /* reference data to display, similar to Arrows */
        this.referenceData = (properties && properties.referenceData) ? properties.referenceData : {};

        this.description = (properties && properties.description) ? properties.description : null;

        this.removedPropertyKeysSinceLastSave = (properties && Array.isArray(properties.removedPropertyKeysSinceLastSave)) ? properties.removedPropertyKeysSinceLastSave : [];
        this.dataChangedSinceLastSave = (properties && typeof(properties.dataChangedSinceLastSave) === 'boolean') ? properties.dataChangedSinceLastSave : false;
        this.dataChangeTimestamp = (properties && typeof(properties.dataChangeTimestamp) === 'number') ? properties.dataChangeTimestamp : undefined;

        setCypherOrigin(this, properties);

        this.display = (properties) ? properties.display : null;

        if (!this.display) {
            this.display = new RelationshipTypeDisplay({
                cypherOrigin: this.cypherOrigin
            });
        }

        // this is just for relationships created directly in the model without being drawn
        if (properties && properties.selfConnected) {
            this.display.offset = properties.startNodeLabel.display.radius;
        }

        this.getColor = () => this.display.getColor();
        this.getFontColor = () => this.display.getFontColor();
        this.getSecondaryData = () => [];

        this.resetDataChangeFlags = (timestamp) => resetPropertyContainerDataChangeFlags(this, timestamp);
        this.getChangedProperties = () => getChangedProperties(this);
        this.getRemovedPropertyKeysSinceLastSave = () => this.removedPropertyKeysSinceLastSave.slice(0)
                                                                                        .map(x => x.changedKey);
        this.addOrUpdateProperty = (propertyMap, booleanFlags) =>
                    addOrUpdateProperty(this, propertyMap, booleanFlags);
        this.addProperty = (propertyMap, booleanFlags, dontNotify) =>
                    addProperty(this, propertyMap, booleanFlags, dontNotify);
        this.getPropertyByName = (name) => getPropertyByName(this, name);
        this.removeProperty = (key) => removeProperty(this, key);
        this.setOutMinCardinality = (value) => {
            var currentValue = this.display.outMinCardinality;
            if (currentValue !== value) {
                this.outMinCardinality = value;
                dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }
        this.setOutMaxCardinality = (value) => {
            var currentValue = this.display.outMaxCardinality;
            if (currentValue !== value) {
                this.outMaxCardinality = value;
                dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }
        this.setInMinCardinality = (value) => {
            var currentValue = this.display.inMinCardinality;
            if (currentValue !== value) {
                this.inMinCardinality = value;
                dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }
        this.setInMaxCardinality = (value) => {
            var currentValue = this.display.inMaxCardinality;
            if (currentValue !== value) {
                this.inMaxCardinality = value;
                dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }
        this.setDisplayOffset = (value) => {
            var currentValue = this.display.offset;
            if (currentValue !== value) {
                this.display.offset = value;
                // TODO: I commented this out because it was causing an intermediate re-render
                //  see if it is actually needed, if so, the uncomment and trace it down
                //dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
            }
        }

        this.update = (obj) => {
            if ('type' in obj) {
                this.type = obj.type;
            }
            if ('description' in obj) {
                this.description = obj.description;
            }
            dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
        }

        this.setCypherOrigin = function (cypherOrigin) {
            setCypherOrigin(this, { cypherOrigin: cypherOrigin });
            setRelationshipTypeCypherOriginDisplay(this.display, { cypherOrigin: this.cypherOrigin});
        }

        this.addDataSource = function (dataSource, dontNotify) {
            if (dataSource) {
                if (!this.fromDataSources) {
                    this.fromDataSources = [];
                }
                if (this.fromDataSources.indexOf(dataSource) == -1) {
                    this.fromDataSources.push(dataSource);
                    if (!dontNotify) {
                        dataChanged(DataChangeType.UpdateRelationshipType, { changedObject: this });
                    }
                }
            }
        }

        this.getDescription = function () {
            return this.startNodeLabel.label + " " + this.type + " " + this.endNodeLabel.label;
        }

        this.getRelationshipDisplayText = function () {
            //(0..many) HAS_CATEGORY (0..1)
            var displayText = '', max = '';
            if (this.inMinCardinality !== '0' || this.inMaxCardinality !== 'many') {
                max = (this.inMaxCardinality === 'many') ? '*' : this.inMaxCardinality;
                displayText = `(${this.inMinCardinality}..${max}) `;
            }
            displayText += (this.type) ? this.type : '';
            if (this.outMinCardinality !== '0' || this.outMaxCardinality !== 'many') {
                max = (this.outMaxCardinality === 'many') ? '*' : this.outMaxCardinality;
                displayText += ` (${this.outMinCardinality}..${max})`;
            }
            //console.log('displayText: ' + displayText);
            return displayText;
        }

        this.getPropertiesString = function () {
            return getPropertiesString(this);
        }

        this.getPropertiesStringWithReferenceData = function () {
            return getPropertiesStringWithReferenceData(this);
        }

        /* prevents serialization of startNodeLabel and endNodeLabel */
        this.getPersistVersion = function (properties) {
            properties = properties || {};
            const { includeChangeInfo } = properties;
            var persistObject = {};
            persistObject.classType = this.classType;
            persistObject.key = this.key;
            persistObject.type = this.type;
            persistObject.startNodeLabelKey = this.startNodeLabel.key;
            persistObject.endNodeLabelKey = this.endNodeLabel.key;
            //persistObject.constraints = this.constraints;
            persistObject.properties = this.properties;
            persistObject.referenceData = this.referenceData;
            persistObject.description = this.description;
            persistObject.outMinCardinality = this.outMinCardinality;
            persistObject.outMaxCardinality = this.outMaxCardinality;
            persistObject.inMinCardinality = this.inMinCardinality;
            persistObject.inMaxCardinality = this.inMaxCardinality;
            persistObject.display = this.display;
            persistObject.dataChangedSinceLastSave = this.dataChangedSinceLastSave;
            persistObject.dataChangeTimestamp = this.dataChangeTimestamp;
            if (includeChangeInfo) {
                persistObject.removedPropertyKeysSinceLastSave = this.removedPropertyKeysSinceLastSave;
            }
            const changedProperties = this.getChangedProperties();
            const removedPropertyKeysSinceLastSave = this.removedPropertyKeysSinceLastSave.slice(0).map(x => x.changedKey);

            persistObject.getChangedProperties = () => changedProperties;
            persistObject.getRemovedPropertyKeysSinceLastSave = () => removedPropertyKeysSinceLastSave;

            return persistObject;
        }

        this.toString = function () {
            var str = '';
            if (this.startNodeLabel) {
                str += '(' + this.startNodeLabel.label + ')';
                str += '-';
            }
            str += '[:' + this.type + ']';
            if (this.endNodeLabel) {
                str += '->';
                str += '(' + this.endNodeLabel.label + ')';
            }
            return str;
        }

        this.getCypherMatchSnippet = function (variable) {
            var id = this.key;
            var cypher = "MATCH (" + variable + ":_NS_RelationshipType {id:'" + id + "'})";
            return cypher;
        }

        this.getRelationshipTypePersistenceStatement = function () {
            var id = this.key;
            var cypher = '';
            cypher += "\nMERGE (rt:_NS_RelationshipType {id:'" + id + "'})";
            cypher += "\nSET rt += {type:'" + this.type + "',"
                    + "\nclassType:'" + this.classType + "'}";
            cypher += '\nWITH rt';

            // TODO: constraints, referenceData, display

            var startVar = 'startNodeLabel';
            var endVar = 'endNodeLabel';

            cypher += '\n' + this.startNodeLabel.getCypherMatchSnippet(startVar);
            cypher += '\n' + this.endNodeLabel.getCypherMatchSnippet(endVar);

            var variableCounter = 1;
            Object.values(this.properties).map(property => {
                var propVariable = 'pd_' + variableCounter;
                variableCounter++;
                cypher += '\n' + property.getCypherMatchSnippet(propVariable);
            });

            cypher += '\nMERGE (' + startVar + ')-[:_NS_HAS_RELATIONSHIP]->(rt)';
            cypher += '\nMERGE (rt)-[:_NS_HAS_RELATIONSHIP]->(' + endVar + ')';

            variableCounter = 1;
            Object.values(this.properties).map(property => {
                var propVariable = 'pd_' + variableCounter;
                variableCounter++;
                cypher += '\nMERGE (rt)-[:_NS_HAS_PROPERTY]->(' + propVariable + ')';
            });
            cypher += ';';
            return cypher;
        }

        this.getCypherPersistenceStatements = function () {
            var cypherStatements = [];
            Object.values(this.properties).map(property => cypherStatements.push(property.getCypherPersistenceStatement()));
            cypherStatements.push(this.getRelationshipTypePersistenceStatement());
            return cypherStatements;
        }

        this.getCypherPersistenceStatement = function () {
            var cypher = '';
            Object.values(this.properties).map(property => cypher += '\n' + property.getCypherPersistenceStatement())
            cypher += '\n';
            cypher += this.getRelationshipTypePersistenceStatement();
            return cypher;
        }

        this.getLLMStyleString = function (dataModel) {
            var propertyCypher = '';
            if (this.properties && Object.keys(this.properties).length > 0) {
                var propertyCypherArray = Object.values(this.properties).map(property => property.getLLMStyleString());
                propertyCypher = ' {' + propertyCypherArray.join(',') + '}';
            }
            var type = (this.type) ? this.type : 'NO_TYPE_DEFINED';
            
            var cypher = `(${this.startNodeLabel.getLLMStyleString({ nodeLabel: LLMString.JustNodeLabel }, dataModel)})` +
                         `-[:${smartQuote(type)}${propertyCypher}]->` +
                         `(${this.endNodeLabel.getLLMStyleString({ nodeLabel: LLMString.JustNodeLabel }, dataModel)})`
            return cypher;
        }

        this.getArrowsStyleCypher = function (variableAssignmentMap, options) {
            if (options === undefined) {
                options = ArrowsCypher.JustVariable;
            }
            var propertyCypher = '';
            if (this.properties && Object.keys(this.properties).length > 0) {
                var propertyCypherArray = Object.values(this.properties).map(property => property.getArrowsStyleCypher());
                propertyCypher = '{' + propertyCypherArray.join(',') + '}';
            }
            var type = (this.type) ? this.type : 'REL';
            var cypher = '  ' + this.startNodeLabel.getArrowsStyleCypher(variableAssignmentMap, options) +
                         '-[:' + smartQuote(type) + ' ' + propertyCypher + ']->' +
                         this.endNodeLabel.getArrowsStyleCypher(variableAssignmentMap, options);
            return cypher;
        }

        this.typeAndPropsAndEndNodeLabelMatch = (relationshipType) => {
            if (this.type === relationshipType.type
                && this.endNodeLabel === relationshipType.endNodeLabel) {
                    const myProps = Object.values(this.properties);
                    const theirProps = Object.values(relationshipType.properties);
                    if (myProps.length === theirProps.length) {
                        const matches = myProps.filter(myProp => theirProps
                            .findIndex(theirProp => theirProp.matchesPropertyDefinition(myProp)) >= 0)
                        if (matches.length === myProps.length) {
                            return true;
                        }
                    }
            }
            return false;
        }
    }

    var hasDataChanged = false;
    var dataChangeListeners = [];

    var dataChanged = function (dataChangeType, details) {
        hasDataChanged = true;
        dataChangeListeners.forEach(changeListener => changeListener({ 
            dataChangeType: dataChangeType,
            details: details
        }));
        switch (dataChangeType) {
            case DataChangeType.AddOrUpdateSecondaryNodeLabel:
            case DataChangeType.AddOrUpdateNodeLabel:
            case DataChangeType.AddRelationshipType:
            case DataChangeType.UpdateRelationshipType:
            case DataChangeType.AddOrUpdateProperty:
            case DataChangeType.AddOrUpdateDataSource:
                details.changedObject.dataChangedSinceLastSave = true;
                details.changedObject.dataChangeTimestamp = new Date().getTime();
                break;
            case DataChangeType.RemoveNodeLabel:
                deletedNodeLabelKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details.changedKey
                });
                break;
            case DataChangeType.RemoveRelationshipType:
                deletedRelationshipTypeKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details.changedKey
                });
                break;
            case DataChangeType.RemoveProperty:
                details.propertyContainer.removedPropertyKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details.changedKey
                });
                break;
            case DataChangeType.RemoveDataSource:
                deletedDataSourceKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details.changedKey
                });
                break;
            case DataChangeType.NodeLabelDisplayUpdate:
                details.changedObject.displayChangedSinceLastSave = true;
                details.changedObject.displayChangeTimestamp = new Date().getTime();
                break;
            case DataChangeType.CanvasTransformUpdate:
                // TODO: do something here
                break;
            case DataChangeType.DataModelPropertyChange:
                // TODO: nothing to do here, the call to data change listeners above
                //   will trigger a save cycle
                break;

        }

    }

    var setDataChanged = function (value) {
        hasDataChanged = value;
    }

    var resetDataChangeFlags = function (saveObject) {
        var timestamp;
        if (saveObject) {
            timestamp = saveObject.timestamp;
        } else {
            timestamp = new Date().getTime();
        }

        Object.values(nodeLabels).map(nodeLabel => nodeLabel.resetDataChangeFlags(timestamp));
        Object.values(relationshipTypes).map(relationshipType => relationshipType.resetDataChangeFlags(timestamp));
        Object.values(dataSources).map(dataSource => dataSource.resetDataChangeFlags(timestamp));

        deletedNodeLabelKeysSinceLastSave = deletedNodeLabelKeysSinceLastSave
                                                    .filter(x => x.dataChangeTimestamp >= timestamp);
        deletedRelationshipTypeKeysSinceLastSave = deletedRelationshipTypeKeysSinceLastSave
                                                    .filter(x => x.dataChangeTimestamp >= timestamp);
        deletedDataSourceKeysSinceLastSave = deletedDataSourceKeysSinceLastSave
                                                    .filter(x => x.dataChangeTimestamp >= timestamp);
    }

    var resetPositionUpdateFlags = function (timestamp) {
        Object.values(nodeLabels)
            .filter(x => x.displayChangeTimestamp < timestamp)
            .map(nodeLabel => nodeLabel.displayChangedSinceLastSave = false);
    }

    var getChangedItems = function () {
        var changedNodeLabels = Object.values(nodeLabels)
            .filter(nodeLabel => (nodeLabel.dataChangedSinceLastSave || nodeLabel.displayChangedSinceLastSave
                                    || nodeLabel.getChangedProperties().length > 0
                                    || nodeLabel.removedPropertyKeysSinceLastSave.length > 0));
        var changedRelationshipTypes = Object.values(relationshipTypes)
            .filter(relationshipType => (relationshipType.dataChangedSinceLastSave
                                    || relationshipType.getChangedProperties().length > 0
                                    || relationshipType.removedPropertyKeysSinceLastSave.length > 0));
        var changedDataSources = Object.values(dataSources).filter(dataSource => dataSource.dataChangedSinceLastSave);

        return {
            changedNodeLabels: (changedNodeLabels) ? changedNodeLabels : [],
            changedRelationshipTypes: (changedRelationshipTypes) ? changedRelationshipTypes : [],
            dataSources: (changedDataSources) ? changedDataSources : []
        }
    }

    var getDeletedItems = function () {
        return {
            deletedNodeLabelKeys: deletedNodeLabelKeysSinceLastSave.slice(0).map(x => x.changedKey),
            deletedRelationshipTypeKeys: deletedRelationshipTypeKeysSinceLastSave.slice(0).map(x => x.changedKey),
            deletedDataSourceKeys: deletedDataSourceKeysSinceLastSave.slice(0).map(x => x.changedKey)
        }
    }

    var resetPropertyContainerDataChangeFlags = (propertyContainer, timestamp) => {
        if (propertyContainer.dataChangeTimestamp < timestamp) {
            propertyContainer.dataChangedSinceLastSave = false;
            if (typeof(propertyContainer.displayChangedSinceLastSave === 'boolean')) {
                propertyContainer.displayChangedSinceLastSave = false;
            }
            propertyContainer.removedPropertyKeysSinceLastSave =
                    propertyContainer.removedPropertyKeysSinceLastSave.filter(x => x.dataChangeTimestamp >= timestamp);

            if (propertyContainer.properties && Object.keys(propertyContainer.properties).length > 0) {
                Object.values(propertyContainer.properties)
                    .filter(x => x.dataChangeTimestamp < timestamp)
                    .map(property => property.dataChangedSinceLastSave = false);
            }
        }
    }

    var addOrUpdateProperty = (propertyContainer, propertyMap, booleanFlags) => {
        var { key } = propertyMap;
        //console.log("propertyContainer");
        //console.log(propertyContainer);
        if (propertyContainer.properties === null) {
            propertyContainer.properties = {};
        }
        var propertyDefinition = propertyContainer.properties[key];
        if (propertyDefinition) {
            return updateProperty(propertyContainer, propertyMap, booleanFlags);
        } else {
            return addProperty(propertyContainer, propertyMap, booleanFlags);
        }
    }

    var removeProperty = (propertyContainer, key) => {
        if (propertyContainer.properties !== null) {
            delete propertyContainer.properties[key];
            delete propertyDefinitions[key];
            //delete generatedKeys[key];
            dataChanged(DataChangeType.RemoveProperty, { propertyContainer: propertyContainer, changedKey: key });
        }
    }

    var setSize = (propertyContainer, size) => {
        if (propertyContainer.display !== null) {
            propertyContainer.display.setSize(size);
            dataChanged(DataChangeType.NodeLabelDisplayUpdate, { changedObject: propertyContainer });
        }
    }

    var setColor = (propertyContainer, hexColor) => {
        if (propertyContainer.display !== null) {
            propertyContainer.display.setColor(hexColor);
            dataChanged(DataChangeType.NodeLabelDisplayUpdate, { changedObject: propertyContainer });
        }
    }

    var boolConfig = function (config, keyName, value) {
        if (typeof(value) === 'boolean') {
            config[keyName] = value;
        }

    }

    var setBoolConfig = function (config, booleanFlags) {
        if (typeof(config) === 'object' && typeof(booleanFlags) === 'object') {
            boolConfig(config, 'isPartOfKey', booleanFlags.isPartOfKey);
            boolConfig(config, 'isArray', booleanFlags.isArray);
            boolConfig(config, 'isIndexed', booleanFlags.isIndexed);
            boolConfig(config, 'hasUniqueConstraint', booleanFlags.hasUniqueConstraint);
            boolConfig(config, 'mustExist', booleanFlags.mustExist);
        }
    }

    var getPropertyByName = function (propertyContainer, name) {
        if (propertyContainer) {
            var matchingProperties = Object.values(propertyContainer.properties).filter(x => x.name === name);
            if (matchingProperties && matchingProperties.length > 0) {
                return matchingProperties[0];
            }
        }
        return null;
    }

    var addProperty = function (propertyContainer, propertyMap, booleanFlags, dontNotify) {
        var { key, name, datatype, referenceData, description, dataChangedSinceLastSave, dataChangeTimestamp } = propertyMap;
        //console.log('FOO: dataChangedSinceLastSave: ', dataChangedSinceLastSave);        
        if (propertyContainer.properties === null) {
            propertyContainer.properties = {};
        }
        var config = {
            key: key,
            name: name,
            datatype: (datatype) ? datatype : DataTypes.String,
            referenceData: (referenceData) ? '' + referenceData : '',
            description: description,
            dataChangedSinceLastSave: dataChangedSinceLastSave, 
            dataChangeTimestamp: dataChangeTimestamp
        }
        //console.log('FOO: config: ', config);        
        setBoolConfig(config, booleanFlags);
        var property = new PropertyDefinition(config);
        propertyContainer.properties[property.key] = property;
        propertyDefinitions[property.key] = property;
        generatedKeys[property.key] = property.key;
        if (!dontNotify) {
            dataChanged(DataChangeType.AddOrUpdateProperty, { propertyContainer: propertyContainer, changedObject: property });
        }
        return property;
    }

    var updateProperty = function (propertyContainer, propertyMap, booleanFlags) {
        var { key, name, datatype, referenceData, description, dataChangedSinceLastSave, dataChangeTimestamp } = propertyMap;
        if (propertyContainer.properties) {
            var propertyDefinition = propertyContainer.properties[key];
            if (propertyDefinition) {
                propertyDefinition.name = name;
                propertyDefinition.datatype = (datatype) ? datatype : DataTypes.String;
                propertyDefinition.referenceData = (referenceData) ? '' + referenceData : '';
                propertyDefinition.description = description;
                propertyDefinition.dataChangedSinceLastSave = dataChangedSinceLastSave;
                propertyDefinition.dataChangeTimestamp = dataChangeTimestamp;
    
                setBoolConfig(propertyDefinition, booleanFlags);
                dataChanged(DataChangeType.AddOrUpdateProperty, { propertyContainer: propertyContainer, changedObject: propertyDefinition });
                return propertyDefinition;
            } else {
                throw new Error("Could not find property '" + key + "' to update");
            }
        } else {
            throw new Error("Could not find property '" + key + "' to update");
        }
    }

    var getChangedProperties = (propertyContainer) => {
        var changedProperties = [];
        if (propertyContainer.properties && Object.keys(propertyContainer.properties).length > 0) {
            changedProperties = Object.values(propertyContainer.properties)
                                    .filter(property => property.dataChangedSinceLastSave);
        }
        return changedProperties;
    }

    /* new multi-label stuff */
    var getSecondaryNodeLabels = (nodeLabel) => nodeLabel.getSecondaryData();

    var getNodeLabelsWhereIAmSecondary = (nodeLabel) => 
        getNodeLabelArray().filter(x => x.secondaryNodeLabelKeys.includes(nodeLabel.key));

    var addSecondaryNodeLabel = (nodeLabel, secondaryNodeLabel) => {
        nodeLabel.addSecondaryNodeLabelKey(secondaryNodeLabel.key);
    }

    var getAllSecondaryNodeLabelProperties = (nodeLabel) => {
        if (nodeLabel) {
            var allProperties = Object.values(nodeLabel.properties);
            getNodeLabelsWhereIAmSecondary(nodeLabel).map(x => {
                Object.values(x.properties).map(prop => {
                    if (!allProperties.includes(prop)) {
                        allProperties.push(prop);
                    }
                });
            })
            return allProperties;
        } else {
            return [];
        }
    }

    var setSecondaryNodeLabels = (nodeLabel, secondaryNodeLabels) => {
        //console.log("setSecondaryNodeLabels: ", nodeLabel, secondaryNodeLabels);
        var currentKeys = nodeLabel.secondaryNodeLabelKeys;
        var updatedKeys = secondaryNodeLabels.map(x => x.key);
        var keysToAdd = updatedKeys.filter(x => !currentKeys.includes(x));
        var keysToRemove = currentKeys.filter(x => !updatedKeys.includes(x));
        if (keysToAdd.length > 0) {
            keysToAdd.map(keyToAdd => nodeLabel.addSecondaryNodeLabelKey(keyToAdd));
        }
        var promptToDelete = [];
        if (keysToRemove.length > 0) {
            var allNodeLabels = getNodeLabelArray();
            keysToRemove.map(keyToRemove => {
                var secondaryNodeLabel = getNodeLabelByKey(keyToRemove);
                if (secondaryNodeLabel && secondaryNodeLabel.isOnlySecondaryNodeLabel) {
                    const isUsed = isSecondaryNodeLabelUsedByOtherNodeLabels(nodeLabel, allNodeLabels, keyToRemove);
                    if (isUsed) {
                        nodeLabel.removeSecondaryNodeLabelKey(keyToRemove);
                    } else {
                        var existingProperties = Object.values(secondaryNodeLabel.properties);
                        if (existingProperties.length > 0) {
                            promptToDelete.push(secondaryNodeLabel);
                        } else {
                            nodeLabel.removeSecondaryNodeLabelKey(keyToRemove);
                            removeNodeLabelByKey(keyToRemove);
                        }
                    }
                } else {
                    nodeLabel.removeSecondaryNodeLabelKey(keyToRemove);
                }
            });
        }
        return promptToDelete;
    }

    var isSecondaryNodeLabelUsedByOtherNodeLabels = (nodeLabelToDeleteFrom, allNodeLabels, secondaryNodeLabelKey) => {
        return allNodeLabels
            .filter(x => x !== nodeLabelToDeleteFrom)
            .find(x => x.secondaryNodeLabelKeys.includes(secondaryNodeLabelKey));
    }

    var removeSecondaryNodeLabel = (nodeLabel, secondaryNodeLabel) => {
        nodeLabel.removeSecondaryNodeLabelKey(secondaryNodeLabel.key);
    }

    var createNewSecondaryNodeLabel = () => {
        return createNewNodeLabel({}, {
            referenceData: {
                isOnlySecondaryNodeLabel: true
            }
        })
    }
    /* end new multi-label stuff */

    var addDataChangeListener = function (changeListener) {
        var index = dataChangeListeners.indexOf(changeListener);
        if (index === -1) {
            dataChangeListeners.push(changeListener);
        }
    }

    var removeDataChangeListener = function (changeListener) {
        var index = dataChangeListeners.indexOf(changeListener);
        if (index >= 0) {
            dataChangeListeners.splice(index,1);
        }
    }

    function addNodeLabel (nodeLabelInstance, dontNotify) {
        if (nodeLabelInstance && nodeLabelInstance.key) {
            // TODO: check if label already exists before over-writing
            nodeLabels[nodeLabelInstance.key] = nodeLabelInstance;
            generatedKeys[nodeLabelInstance.key] = nodeLabelInstance.key;
            if (!dontNotify) {
                dataChanged(DataChangeType.AddOrUpdateNodeLabel, { changedObject: nodeLabelInstance });
            }
        }
    }

    function addDataSource (dataSourceInstance, dontNotify) {
        if (dataSourceInstance && dataSourceInstance.key) {
            dataSources[dataSourceInstance.key] = dataSourceInstance;
            generatedKeys[dataSourceInstance.key] = dataSourceInstance.key;
            if (!dontNotify) {
                dataChanged(DataChangeType.AddOrUpdateDataSource, { changedObject: dataSourceInstance });
            }
        }
    }

    function removeNodeLabelByKey (nodeLabelInstanceKey) {
        //console.log('removeNodeLabelByKey: ' + nodeLabelInstanceKey);
        if (nodeLabelInstanceKey) {
            var nodeLabelArray = getNodeLabelArray();
            var nodeLabel = getNodeLabelByKey(nodeLabelInstanceKey);
            var usedBy = null;
            // remove any unused node labels that are not used any more
            if (nodeLabel) {
                nodeLabel.secondaryNodeLabelKeys.map(secondaryNodeLabelKey => {
                    var secondaryNodeLabel = getNodeLabelByKey(secondaryNodeLabelKey)
                    if (secondaryNodeLabel && secondaryNodeLabel.isOnlySecondaryNodeLabel) {
                        usedBy = nodeLabelArray
                            .filter(x => x.key !== nodeLabelInstanceKey)
                            .find(x => x.secondaryNodeLabelKeys.includes(secondaryNodeLabelKey));
                        if (!usedBy && secondaryNodeLabelKey !== nodeLabelInstanceKey) {
                            //console.log('deleting nodeLabels because no longer used');
                            delete nodeLabels[secondaryNodeLabelKey];
                            //delete generatedKeys[secondaryNodeLabelKey];
                            dataChanged(DataChangeType.RemoveNodeLabel, { changedKey: secondaryNodeLabelKey });
                        }
                    }
                });
            }

            // if node is used as a secondary node label, 
            //  then change isOnlySecondaryNodeLabel=false to isOnlySecondaryNodeLabel=true, but don't delete it
            usedBy = nodeLabelArray.find(x => x.secondaryNodeLabelKeys.includes(nodeLabelInstanceKey));
            //console.log('usedBy', usedBy)
            if (usedBy) {
                if (nodeLabel) {
                    //console.log('nodeLabel.setIsOnlySecondaryNodeLabel', nodeLabel)
                    nodeLabel.setIsOnlySecondaryNodeLabel(true);
                    nodeLabel.clearSecondaryNodeLabelKeys();
                }
            } else {
                delete nodeLabels[nodeLabelInstanceKey];
                //delete generatedKeys[nodeLabelInstanceKey];
                dataChanged(DataChangeType.RemoveNodeLabel, { changedKey: nodeLabelInstanceKey });
            }
        }
    }

    function getOutboundRelationshipsByNodeLabelAndRelationshipType (nodeLabelString, relationshipTypeString) {
        var nodeLabel = getNodeLabelByLabel(nodeLabelString);
        if (nodeLabel) {
            return Object.values(relationshipTypes).filter(relationshipType =>
                relationshipType.startNodeLabel === nodeLabel
                && relationshipType.type === relationshipTypeString
            );
        } 
        return [];
    }

    function getOutboundRelationshipTypesForNodeLabelByKey (nodeLabelInstanceKey) {
        return Object.values(relationshipTypes).filter(relationshipType =>
                                relationshipType.startNodeLabel.key === nodeLabelInstanceKey);
    }

    function getRelationshipTypesForNodeLabelByKey (nodeLabelInstanceKey) {
        return Object.values(relationshipTypes).filter(relationshipType =>
                                (relationshipType.startNodeLabel.key === nodeLabelInstanceKey
                                || relationshipType.endNodeLabel.key === nodeLabelInstanceKey));
    }

    function removeNodeLabel (nodeLabelInstance) {
        if (nodeLabelInstance) {
            removeNodeLabelByKey(nodeLabelInstance.key);
        }
    }

    function removeDataSource (dataSourceInstance) {
        if (dataSourceInstance) {
            delete dataSources[dataSourceInstance.key];
            //delete generatedKeys[dataSourceInstance.key];
            dataChanged(DataChangeType.RemoveDataSource, { changedKey: dataSourceInstance.key });
        }
    }

    function getNodeLabelByKey (key) {
        return nodeLabels[key];
    }

    function getDataSourceArray () {
        return Object.values(dataSources);
    }

    function getDataSourceByExpression (dataSourceExpression) {
        var dataSourceArray = getDataSourceArray();
        for (var i = 0; i < dataSourceArray.length; i++) {
            if (dataSourceArray[i].fromExpression === dataSourceExpression) {
                return dataSourceArray[i];
            }
        }
        return null;
    }

    function getNodeLabelMap () {
        return nodeLabels;
    }

    function checkIfNodeLabelTaken (labelToCheck) {
        //return Object.values(nodeLabels).some(nodeLabel => nodeLabel.label === labelToCheck);
        return false;
    }

    function checkIfNodeLabelTakenInternal (labelToCheck) {
        return Object.values(nodeLabels).some(nodeLabel => nodeLabel.label === labelToCheck);
    }

    function createNewNodeLabel (displayProperties, nodeLabelProperties) {
        var newNodeLabel = null;
        for (var i = 1; i < 1000; i++) {
            var labelToTry = NEW_NODE_LABEL_KEY_PREFIX + ' ' + i;
            var existingNode = checkIfNodeLabelTakenInternal(labelToTry);
            if (!existingNode) {
                var properties;
                if (displayProperties) {
                    properties = {
                        label: labelToTry,
                        display: new NodeLabelDisplay(displayProperties)
                    }
                } else {
                    properties = {
                        label: labelToTry,
                    }
                }
                nodeLabelProperties = (nodeLabelProperties) ? nodeLabelProperties : {};
                properties = { ...properties, ...nodeLabelProperties };

                newNodeLabel = new NodeLabel(properties);
                //addNodeLabel(newNodeLabel); // we will make the caller add this explicitly to the model
                break;
            }
        }
        return newNodeLabel;
    }

    function processLabel (label) {
        var tokens = label.split(':');
        return {
            primaryNodeLabelString: tokens[0],
            secondaryNodeLabelStrings: tokens.slice(1)
        }
    }

    function getPrimaryNodeLabelAndEnsureSecondaryNodeLabels (label, dataModel) {
        var { primaryNodeLabelString, secondaryNodeLabelStrings } = processLabel(label);
        var primaryNodeLabel = getNodeLabelArray().find(nodeLabel => nodeLabel.label === primaryNodeLabelString);
        if (primaryNodeLabel) {
            ensureSecondaryNodeLabels(primaryNodeLabel, secondaryNodeLabelStrings, dataModel);
        } 
        return primaryNodeLabel;       
    }

    function createPrimaryNodeLabelWithSecondaryNodeLabels (label, dataModel) {
        var { primaryNodeLabelString, secondaryNodeLabelStrings } = processLabel(label);
        var properties = {
            label: primaryNodeLabelString
        }
        var primaryNodeLabel = new NodeLabel(properties);
        ensureSecondaryNodeLabels(primaryNodeLabel, secondaryNodeLabelStrings, dataModel);
        return primaryNodeLabel;
    }

    function ensureSecondaryNodeLabels (primaryNodeLabel, secondaryNodeLabelStrings, dataModel) {
        var existingStrings = primaryNodeLabel.secondaryNodeLabelKeys.map(key => getNodeLabelByKey(key).label);
        var labelsToAdd = secondaryNodeLabelStrings.filter(x => !existingStrings.includes(x));
        var existingNodeLabels = getNodeLabelArray();
        labelsToAdd.map(labelToAdd => {
            var secondaryNodeLabel = existingNodeLabels.find(nodeLabel => nodeLabel.label === labelToAdd);            
            if (!secondaryNodeLabel) {
                secondaryNodeLabel = new NodeLabel({
                    label: labelToAdd,
                    referenceData: {
                        isOnlySecondaryNodeLabel: true
                    }
                });
                dataModel.addNodeLabel(secondaryNodeLabel);
            }
            primaryNodeLabel.addSecondaryNodeLabelKey(secondaryNodeLabel.key);
        });
    }

    function getNodeLabelByLabel (label) {
        return Object.values(nodeLabels).find(nodeLabel => nodeLabel.label === label);
    }

    function getNodeLabelsByLabel (label) {
        return Object.values(nodeLabels).filter(nodeLabel => nodeLabel.label === label);
    }

    // instance models are any models where there is a duplicate node label
    function isInstanceModel () {
        var nodeLabelCounts = {};
        var foundIt = Object.values(nodeLabels).find(nodeLabel => {
            var nodeLabelString = nodeLabel.label;
            var alreadyExists = nodeLabelCounts[nodeLabelString];
            if (alreadyExists) {
                return true;
            } else {
                nodeLabelCounts[nodeLabelString] = nodeLabelString;
            }
        });
        return (foundIt) ? true : false;
    }

    function getNodeLabelArray () {
        return Object.values(nodeLabels);
    }

    function addRelationshipType (relationshipTypeInstance, dontNotify) {
        if (relationshipTypeInstance && relationshipTypeInstance.key) {
            relationshipTypes[relationshipTypeInstance.key] = relationshipTypeInstance;
            if (!dontNotify) {
                dataChanged(DataChangeType.AddRelationshipType, { changedObject: relationshipTypeInstance });
            }
        }
    }

    function getRelationshipTypeByKey (key) {
        return relationshipTypes[key];
    }

    function removeRelationshipTypeByKey (relationshipTypeInstanceKey, dontNotify) {
        if (relationshipTypeInstanceKey) {
            delete relationshipTypes[relationshipTypeInstanceKey];
            if (!dontNotify) {
                dataChanged(DataChangeType.RemoveRelationshipType, { changedKey: relationshipTypeInstanceKey });
            }
        }
    }

    function removeRelationshipType (relationshipTypeInstance) {
        if (relationshipTypeInstance) {
            delete relationshipTypes[relationshipTypeInstance.key];
            dataChanged(DataChangeType.RemoveRelationshipType, { changedKey: relationshipTypeInstance.key });
        }
    }

    function getRelationshipTypeMap () {
        return relationshipTypes;
    }

    function getRelationshipTypeArray () {
        return Object.values(relationshipTypes);
    }

    function getConnectedRelationshipTypes (nodeLabel) {
        //console.log("getConnectedRelationshipTypes: ", getConnectedRelationshipTypes);
        var array = getRelationshipTypeArray();
        //console.log("array: ", array);
        array = array.filter(relationshipType => (relationshipType.startNodeLabel === nodeLabel
                                                || relationshipType.endNodeLabel === nodeLabel));
        //console.log("filtered array: ", array);
        return array;
    }

    function getOutboundNodeLabelStringRelationshipTypeStringMap () {
        var returnMap = {};
        getNodeLabelArray().map(nodeLabel => {
            returnMap[nodeLabel.label] = [];
        });
        getRelationshipTypeArray().map(relationshipType => {
            var array = returnMap[relationshipType.startNodeLabel.label];
            if (!array.includes(relationshipType.type)) {
                array.push(relationshipType.type);
            }
        });
        return returnMap;
    }

    function getOutboundNodeLabelKeyRelationshipTypeMap () {
        var returnMap = {};
        getNodeLabelArray().map(nodeLabel => {
            returnMap[nodeLabel.key] = [];
        });
        getRelationshipTypeArray().map(relationshipType => {
            var array = returnMap[relationshipType.startNodeLabel.key];
            if (!array.includes(relationshipType)) {
                array.push(relationshipType);
            }
        });
        return returnMap;
    }

    function getConnectedRelationshipTypeBetweenNodeLabels (nodeLabel1, nodeLabel2) {
        var connections = [];
        var array = getRelationshipTypeArray().sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1);
        for (var i = 0; i < array.length; i++) {
            var relationshipType = array[i];
            if ((relationshipType.startNodeLabel === nodeLabel1 && relationshipType.endNodeLabel === nodeLabel2)
                || (relationshipType.startNodeLabel === nodeLabel2 && relationshipType.endNodeLabel === nodeLabel1)) {
                connections.push(relationshipType);
            }
        }
        return connections;
    }

    function getConnectedNodeLabels (nodeLabel) {
        //console.log("getConnectedNodeLabels nodeLabel: ", nodeLabel);
        var connections = getConnectedRelationshipTypes(nodeLabel);
        // return the other end of the relationship type
        var connectedNodeLabels = connections.map(x => (x.startNodeLabel === nodeLabel) ? x.endNodeLabel : x.startNodeLabel);
        //console.log("getConnectedNodeLabels connectedNodeLabels: ", connectedNodeLabels);
        return connectedNodeLabels;
    }

    /* fetch relationships where the start and end nodes are the same */
    function getNodeLabelsThatHaveSelfConnectedRelationships () {
        var nodeLabels = [];
        var array = getRelationshipTypeArray();
        for (var i = 0; i < array.length; i++) {
            var relationshipType = array[i];
            if (relationshipType.startNodeLabel === relationshipType.endNodeLabel) {
                nodeLabels.push(relationshipType.startNodeLabel);
            }
        }
        return nodeLabels;
    }

    /* fetch relationships where there are more than 1 relationship between the start and end nodes */
    function getNodeLabelPairsThatHaveMoreThanOneRelationshipBetweenThem () {
        var map = {};
        var array = getRelationshipTypeArray();
        for (var i = 0; i < array.length; i++) {
            var mapKey = null;
            var relationshipType = array[i];
            if (relationshipType.startNodeLabel && relationshipType.endNodeLabel) {
                // do alphabetic comparison - so that node-pairs are always ordered the same regardless if they are start-end or end-start
                // e.g. A-TO->B and B-FROM->A will result in a key A_B that will count both TO and FROM making the count 2
                if (relationshipType.startNodeLabel.key < relationshipType.endNodeLabel.key) {
                    mapKey = relationshipType.startNodeLabel.key + "_" + relationshipType.endNodeLabel.key;
                } else {
                    mapKey = relationshipType.endNodeLabel.key + "_" + relationshipType.startNodeLabel.key;
                }
                var mapEntry = map[mapKey];
                if (!mapEntry) {
                    mapEntry = {
                        node1: relationshipType.startNodeLabel,
                        node2: relationshipType.endNodeLabel,
                        count: 0
                    };
                    map[mapKey] = mapEntry;
                }
                mapEntry.count++;
            }
        }

        var mapToReturn = {};
        Object.keys(map)
            .filter(mapKey => map[mapKey].count > 1)
            .map(mapKey => mapToReturn[mapKey] = map[mapKey]);
        return mapToReturn;
    }

    function getRelationshipType (relationshipTypeString, startNodeLabelString, endNodeLabelString) {
        var array = getRelationshipTypeArray();
        for (var i = 0; i < array.length; i++) {
            var relationshipType = array[i];
            if (relationshipType.startNodeLabel.label === startNodeLabelString
                 && relationshipType.endNodeLabel.label === endNodeLabelString
                 && relationshipType.type === relationshipTypeString) {
                return relationshipType;
            }
        }
        return null;
    }

    const getRelationshipTypesByType = (relationshipTypeString) => 
        getRelationshipTypeArray()
            .filter(relationshipType => relationshipType.type === relationshipTypeString);

    function doesMatchingRelationshipTypeExist (relationshipTypeToMatch) {
        var array = getRelationshipTypeArray();
        for (var i = 0; i < array.length; i++) {
            var relationshipType = array[i];
            if (relationshipType.startNodeLabel.label === relationshipTypeToMatch.startNodeLabel.label
                 && relationshipType.endNodeLabel.label === relationshipTypeToMatch.endNodeLabel.label
                 && relationshipType.type === relationshipTypeToMatch.type) {
                return true;
            }
        }
        return false;
    }

    function getBooleanFlags (props) {
        return {
            isPartOfKey: props.isPartOfKey,
            isIndexed: props.isIndexed,
            isArray: props.isArray,
            mustExist: props.mustExist,
            hasUniqueConstraint: props.hasUniqueConstraint
        }
    }

    function addProperties (properties, objToAddTo, dontNotify) {
        if (typeof(properties) === 'object') {
            Object.values(properties)
                .map(propObj => {
                    var propertyMap = {
                        ...propObj,
                        key: getLocalKey(propObj.key)
                    }
                    //console.log('FOO: propertyMap: ', propertyMap);
                    objToAddTo.addProperty(
                        propertyMap,
                        getBooleanFlags(propObj), 
                        dontNotify
                    )
                });
        }
    }

    function fromJSON (jsonString) {
        var jsonObject = JSON.parse(jsonString);
        fromSaveObject(jsonObject);
    }

    function getLocalKey (key) {
        var tokens = key.split(new RegExp(ID_JOINER));
        if (tokens && tokens.length > 1) {
            return tokens[1];
        } else {
            return key;
        }
    }

    function fromSaveObject (jsonObject, keepDataChangeFlags) {
        nodeLabels = {};
        relationshipTypes = {};
        propertyDefinitions = {};
        dataSources = {};
        generatedKeys = {};
        excludeValidationSections = Array.isArray(jsonObject.excludeValidationSections) ?
            jsonObject.excludeValidationSections : [];

        deletedNodeLabelKeysSinceLastSave = (jsonObject.deletedNodeLabelKeysSinceLastSave) ? jsonObject.deletedNodeLabelKeysSinceLastSave : [];
        deletedRelationshipTypeKeysSinceLastSave = (jsonObject.deletedRelationshipTypeKeysSinceLastSave) ? jsonObject.deletedRelationshipTypeKeysSinceLastSave : [];
        deletedDataSourceKeysSinceLastSave = (jsonObject.deletedDataSourceKeysSinceLastSave) ? jsonObject.deletedDataSourceKeysSinceLastSave : [];

        //relationshipIdCounter = (jsonObject.relationshipIdCounter) ? jsonObject.relationshipIdCounter : 0;
        Object.values(jsonObject.nodeLabels)
            .map(nodeLabelObj => {
                var properties = nodeLabelObj.properties;
                nodeLabelObj.key = getLocalKey(nodeLabelObj.key);
                delete nodeLabelObj.properties;
                nodeLabelObj.display = new NodeLabelDisplay(nodeLabelObj.display);
                var nodeLabel = new NodeLabel(nodeLabelObj);
                addNodeLabel(nodeLabel, true);
                addProperties(properties, nodeLabel, true);
            });

        Object.values(jsonObject.relationshipTypes)
            .map(relationshipTypeObj => {
                relationshipTypeObj.startNodeLabel = nodeLabels[getLocalKey(relationshipTypeObj.startNodeLabelKey)];
                relationshipTypeObj.endNodeLabel = nodeLabels[getLocalKey(relationshipTypeObj.endNodeLabelKey)];
                delete relationshipTypeObj.startNodeLabelKey;
                delete relationshipTypeObj.endNodeLabelKey;
                var properties = relationshipTypeObj.properties;
                relationshipTypeObj.key = getLocalKey(relationshipTypeObj.key);
                delete relationshipTypeObj.properties;
                relationshipTypeObj.display = new RelationshipTypeDisplay(relationshipTypeObj.display);
                var relationshipType = new RelationshipType(relationshipTypeObj);
                addRelationshipType(relationshipType, true);
                addProperties(properties, relationshipType, true);
            });

        if (!keepDataChangeFlags) {
            resetDataChangeFlags();
        }
    }

    function getDataModelInstanceNumber () {
        return dataModelInstanceNumber;
    }

    function toCypherArray () {
        var cypherArray = [];
        Object.values(nodeLabels).map(nodeLabel =>
                cypherArray = cypherArray.concat(nodeLabel.getCypherPersistenceStatements()));
        Object.values(relationshipTypes).map(relationshipType =>
                cypherArray = cypherArray.concat(relationshipType.getCypherPersistenceStatements()));
        return cypherArray;
    }

    function toCypher () {
        var cypher = '';
        Object.values(nodeLabels).map(nodeLabel => {
            if (cypher) {
                cypher += '\n';
            }
            cypher += '\n';
            cypher += nodeLabel.getCypherPersistenceStatement();
        });

        Object.values(relationshipTypes).map(relationshipType => {
            if (cypher) {
                cypher += '\n';
            }
            cypher += '\n';
            cypher += relationshipType.getCypherPersistenceStatement();
        });
        return cypher;
    }

    function getConstraintStatements () {
        return getConstraintStatementsEx(nodeLabels, relationshipTypes);
    }

    function toLLMModelText (dataModel, options) {

        options = options || {};
        let llmNodeLabelText = (options.llmNodeLabelText) ? 
            options.llmNodeLabelText
            :
            `List of Node Labels with their Properties 
            line format: (:NodeLabel): [property1:'datatype1',property2:'datatype2',...]
            (:NodeLabel) can optionally have secondary node labels (:NodeLabel:SecondaryLabel1:SecondaryLabel2,...)`

        let llmRelationshipTypeText = (options.llmRelationshipTypeText) ? 
            options.llmRelationshipTypeText
            :
            `List of Relationship traversal paths 
            line format: (:NodeLabel)-[:RELATIONSHIP_TYPE]->(:NodeLabel)
            optional RELATIONSHIP_TYPE properties are included between curly braces [:RELATIONSHIP_TYPE {property1:'dataType1',...}]`

        var nodeLabelLLMText = Object.values(nodeLabels)
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel)
            .map(nodeLabel => nodeLabel.getLLMStyleString({ nodeLabel: LLMString.NodeLabelAndProperties }, dataModel));
        var relationshipTypeLLMText = Object.values(relationshipTypes).map(relationshipType => 
                                    relationshipType.getLLMStyleString(dataModel));

        let llmText = `${llmNodeLabelText}
            
            ${nodeLabelLLMText.join('\n')}

            ${llmRelationshipTypeText}

            ${relationshipTypeLLMText.join('\n')}
        `;

        llmText = llmText.split('\n').map(line => line.trimStart()).join('\n');
        return llmText;
    }

    function toArrowsStyleCypher (dataModel, options) {
        options = options || {};
        let nodesInRelationships = ArrowsCypher.JustVariable;
        if (options.nodesInRelationships) {
            nodesInRelationships = options.nodesInRelationships;
        }
        let cypherType = options.cypherType ? options.cypherType : CypherType.Create;

        var variableAssignmentMap = {};
        var nodeCypherArray = Object.values(nodeLabels)
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel)
            .map(nodeLabel => nodeLabel.getArrowsStyleCypher(variableAssignmentMap, ArrowsCypher.VariableNodeLabelsAndProperties, dataModel));
        var relationshipCypherArray = Object.values(relationshipTypes).map(relationshipType => 
                                    relationshipType.getArrowsStyleCypher(variableAssignmentMap, nodesInRelationships));

        let cypher = '';
        let nodeCypherString = '';
        let relationshipCypherString = '';

        switch (cypherType) {
            case CypherType.Merge:
                nodeCypherString = nodeCypherArray.map(x => `MERGE ${x}`).join('\n')
                relationshipCypherString = relationshipCypherArray.map(x => `MERGE ${x}`).join('\n');
                nodeCypherString = (relationshipCypherString) ? nodeCypherString + '\n' : nodeCypherString;
                break;
            case CypherType.Match:
                // TODO
                break;
            case CypherType.Create:
            default:
                nodeCypherString = 'CREATE \n' + nodeCypherArray.join(',\n');
                relationshipCypherString = relationshipCypherArray.join(',\n');
                nodeCypherString = (relationshipCypherString) ? nodeCypherString + ',\n' : nodeCypherString;
        }
        cypher = nodeCypherString + relationshipCypherString;
        return cypher;
    }

    function toSaveObject () {
        var relationshipTypesToPersist = {};
        Object.keys(relationshipTypes).map(key => relationshipTypesToPersist[key] = relationshipTypes[key].getPersistVersion({ includeChangeInfo: true }));

        var savedNodeLabels = {};
        Object.keys(nodeLabels).map(nodeLabelKey => {
            const nodeLabel = nodeLabels[nodeLabelKey];
            savedNodeLabels[nodeLabelKey] = {                    
                ...nodeLabel, 
                referenceData: JSON.stringify(nodeLabel.getReferenceData())
            }
        });

        var obj = {
            isRemotelyPersisted: isRemotelyPersisted,
            //relationshipIdCounter: relationshipIdCounter,
            nodeLabels: savedNodeLabels,
            relationshipTypes: relationshipTypesToPersist,
            excludeValidationSections: excludeValidationSections,
            deletedNodeLabelKeysSinceLastSave: deletedNodeLabelKeysSinceLastSave,
            deletedRelationshipTypeKeysSinceLastSave: deletedRelationshipTypeKeysSinceLastSave,
            deletedDataSourceKeysSinceLastSave: deletedRelationshipTypeKeysSinceLastSave,
            timestamp: new Date().getTime()
        }
        return obj;
    }

    function toExportObject (combineRels) {
        var nodeLabelsToExport = {};
        Object.keys(nodeLabels)
            .map(key => {
                var exportVersion = { ...nodeLabels[key] };
                exportVersion.referenceData = JSON.stringify(nodeLabels[key].getReferenceData());
                delete exportVersion.removedPropertyKeysSinceLastSave;
                delete exportVersion.dataChangedSinceLastSave;
                delete exportVersion.dataChangeTimestamp;
                delete exportVersion.displayChangedSinceLastSave;
                delete exportVersion.displayChangeTimestamp;
                nodeLabelsToExport[key] = exportVersion;
                Object.keys(exportVersion.properties).map(propertyKey => {
                    var propObj = { ...exportVersion.properties[propertyKey] };
                    delete propObj.dataChangedSinceLastSave;
                    delete propObj.dataChangeTimestamp;
                    exportVersion.properties[propertyKey] = propObj;
                })
            });

        var relationshipTypesToExport = {};
        Object.keys(relationshipTypes)
            .map(key => {
                var exportVersion = relationshipTypes[key].getPersistVersion({ includeChangeInfo: false });
                delete exportVersion.removedPropertyKeysSinceLastSave;
                delete exportVersion.dataChangedSinceLastSave;
                delete exportVersion.dataChangeTimestamp;
                delete exportVersion.displayChangedSinceLastSave;
                delete exportVersion.displayChangeTimestamp;
                relationshipTypesToExport[key] = exportVersion;
                Object.keys(exportVersion.properties).map(propertyKey => {
                    var propObj = { ...exportVersion.properties[propertyKey] };
                    delete propObj.dataChangedSinceLastSave;
                    delete propObj.dataChangeTimestamp;
                    exportVersion.properties[propertyKey] = propObj;
                })
            });

        if (combineRels) {
            var newRelMap = {};
            Object.values(relationshipTypesToExport).map(relType => {
                var newKey = relType.startNodeLabelKey + '_' + relType.endNodeLabelKey;
                var existingRel = newRelMap[newKey];
                if (!existingRel) {
                    newRelMap[newKey] = relType;
                    delete relType.outMaxCardinality;
                    delete relType.outMinCardinality;
                    delete relType.inMinCardinality;
                    delete relType.inMaxCardinality;
                    //delete relType.constraints;
                    delete relType.referenceData;
                    delete relType.properties;
                    delete relType.display;
                } else {
                    existingRel.type += '|' + relType.type;
                }
            });
            relationshipTypesToExport = newRelMap;
        }

        var obj = {
            nodeLabels: nodeLabelsToExport,
            relationshipTypes: relationshipTypesToExport
        }
        return obj;
    }

    function toJSON (prettyPrint) {
        var obj = toSaveObject();

        if (prettyPrint) {
            return JSON.stringify(obj, null, 2);
        } else {
            return JSON.stringify(obj);
        }
    }

    function getMatchingSubgraph (subgraph) {
        var currentNodeLabels = getNodeLabelArray();
        var currentRelationshipTypes = getRelationshipTypeArray();
        var subgraphNodeLabels = subgraph.getNodeLabelArray();
        var subgraphRelationshipTypes = subgraph.getRelationshipTypeArray();

        var matchingNodeLabels = [];
        for (var i = 0; i < currentNodeLabels.length; i++) {
            for (var j = 0; j < subgraphNodeLabels.length; j++) {
                if (currentNodeLabels[i].label === subgraphNodeLabels[j].label) {
                    matchingNodeLabels.push(currentNodeLabels[i]);
                }
            }
        }

        var matchingRelationshipTypes = [];
        for (i = 0; i < currentRelationshipTypes.length; i++) {
            for (j = 0; j < subgraphRelationshipTypes.length; j++) {
                if (currentRelationshipTypes[i].type === subgraphRelationshipTypes[j].type
                    && currentRelationshipTypes[i].startNodeLabel.label === subgraphRelationshipTypes[j].startNodeLabel.label
                    && currentRelationshipTypes[i].endNodeLabel.label === subgraphRelationshipTypes[j].endNodeLabel.label) {
                    matchingRelationshipTypes.push(currentRelationshipTypes[i]);
                }
            }
        }

        return {
            nodeLabels: matchingNodeLabels,
            relationshipTypes: matchingRelationshipTypes
        }
    }

    function getDataModelNodeCypherStatement (dataModelId, dataModelPropertyMap, tags) {
        var cypher = '';

        if (!dataModelId) {
            cypher += "MERGE (dsCounter:_NS_DataModelCounter {id:'_ns_dataModelCounter'})";
            cypher += "\n  ON CREATE SET dsCounter.counter = 1";
            cypher += "\n  ON MATCH SET dsCounter.counter = coalesce(dsCounter.counter, 1) + 1";
            cypher += "\nWITH dsCounter.counter as dataModelId";
        } else {
            cypher += "WITH '" + dataModelId + "' as dataModelId";
        }

        var props = '';
        cypher += "\nMERGE (dm:_NS_DataModel {id:dataModelId})";
        cypher += "\n  ON CREATE SET dm.dateCreated = timestamp()";
        cypher += "\n  ON MATCH SET dm.dateUpdated = timestamp()";
        cypher += '\nSET dm += {'
        Object.keys(dataModelPropertyMap).map(mapKey => {
            var value = dataModelPropertyMap[mapKey];
            if (props) {
                props += ',';
            }
            value = (typeof(value) == 'string') ? "'" + value + "'" : value;
            props += "\n    " + mapKey + ": " + value;
        })
        cypher += props;
        cypher += '\n}'
        cypher += "\nMERGE (dmj:_NS_DataModel_Base64Json {id: dataModelId + '_base64_json'})";
        cypher += '\nSET dmj += {'
        cypher += "\n    base64json:'" + btoa(toJSON()) + "'";
        cypher += '\n}'
        cypher += "\nMERGE (dm)-[:_NS_HAS_JSON]->(dmj)";
        cypher += "\nWITH dm";

        var varCounter = 1;

        Object.values(nodeLabels).map(nodeLabel => {
            var variable = 'dmn_' + varCounter; // dmn = data model node
            varCounter++;
            cypher += '\n' + nodeLabel.getCypherMatchSnippet(variable);

            Object.values(nodeLabel.properties).map(property => {
                variable = 'dmn_' + varCounter;
                varCounter++;
                cypher += '\n' + property.getCypherMatchSnippet(variable);
            })
        })

        Object.values(relationshipTypes).map(relationshipType => {
            var variable = 'dmn_' + varCounter; // dmn = data model node
            varCounter++;
            cypher += '\n' + relationshipType.getCypherMatchSnippet(variable);

            Object.values(relationshipType.properties).map(property => {
                variable = 'dmn_' + varCounter;
                varCounter++;
                cypher += '\n' + property.getCypherMatchSnippet(variable);
            });
        });

        for (var i = 1; i < varCounter; i++) {
            var variable = 'dmn_' + i;
            cypher += "\nMERGE (" + variable + ")-[:_NS_PART_OF_MODEL]->(dm)";
        }

        if (tags && tags.length) {
            for (var j = 0; j < tags.length; j++) {
                var tagVariable = 'tag_' + j;
                var tagValue = tags[j];
                cypher += "\nMERGE (" + tagVariable + ":_NS_Tag {tag:'" + tagValue + "'})";
                cypher += "\nMERGE (dm)-[:_NS_HAS_TAG]->(" + tagVariable + ")";
            }
        }

        return cypher;
    }

    function getIsRemotelyPersisted () { return isRemotelyPersisted; }
    function setIsRemotelyPersisted (isRemotelyPersistedVar) { isRemotelyPersisted = isRemotelyPersistedVar; }

    function getPath (fromNode, toNode) {
        /*
        var relationshipTypeArray = getRelationshipTypesForNodeLabelByKey(fromNode.key);

        var path = [];
        var visitedNodes = {};

        for (var i = 0; i < relationshipTypeArray.length; i++) {
            relationshipTypeArray[i];
        }
        */
    }

    function findItemsByText (searchText) {
        var items = [];
        if (searchText) {
            searchText = searchText.toLowerCase();
            // TODO: add search support for property definitions
            var nodeLabelScores = getNodeLabelArray().map(nodeLabel => {
                var score = (nodeLabel && nodeLabel.label) ? 
                    JaroWrinker(searchText, nodeLabel.label.toLowerCase()) : 0;
                return {
                    matchingItem: nodeLabel,
                    matchType: 'NodeLabel',
                    score: score
                }
            }).filter(x => x.score > 0);

            var relationshipTypeScores = getRelationshipTypeArray().map(relationshipType => {
                var score = (relationshipType && relationshipType.type) ? 
                        JaroWrinker(searchText, relationshipType.type.toLowerCase()) : 0;
                return {
                    matchingItem: relationshipType,
                    matchType: 'RelationshipType',
                    score: score
                }
            }).filter(x => x.score > 0);

            items = nodeLabelScores.concat(relationshipTypeScores);
            items.sort((a,b) => b.score-a.score);
        }
        return items;
    }

    return {
        name: 'DataModel',
        ID_JOINER: ID_JOINER,
        DataTypes: DataTypes,
        DataChangeType: DataChangeType,
        CypherOrigin: CypherOrigin,
        PropertyDefinition: PropertyDefinition,
        Constraint: Constraint,
        NodeLabel: NodeLabel,
        RelationshipType: RelationshipType,
        NodeLabelDisplay: NodeLabelDisplay,
        RelationshipTypeDisplay: RelationshipTypeDisplay,
        DataSource: DataSource,
        getNewPropertyDefinition: getNewPropertyDefinition,
        addDataSource: addDataSource,
        removeDataSource: removeDataSource,
        getDataSourceArray: getDataSourceArray,
        getDataSourceByExpression: getDataSourceByExpression,
        getDataModelInstanceNumber: getDataModelInstanceNumber,
        addNodeLabel: addNodeLabel,
        removeNodeLabel: removeNodeLabel,
        removeNodeLabelByKey: removeNodeLabelByKey,
        isInstanceModel: isInstanceModel,
        getNodeLabelByKey: getNodeLabelByKey,
        checkIfNodeLabelTaken: checkIfNodeLabelTaken,
        createNewNodeLabel: createNewNodeLabel,
        getNodeLabelByLabel: getNodeLabelByLabel,
        getNodeLabelsByLabel: getNodeLabelsByLabel,
        getNodeLabelMap: getNodeLabelMap,
        getNodeLabelArray: getNodeLabelArray,
        getOutboundRelationshipsByNodeLabelAndRelationshipType: getOutboundRelationshipsByNodeLabelAndRelationshipType,
        getRelationshipTypesForNodeLabelByKey: getRelationshipTypesForNodeLabelByKey,
        getOutboundRelationshipTypesForNodeLabelByKey: getOutboundRelationshipTypesForNodeLabelByKey,
        addRelationshipType: addRelationshipType,
        getRelationshipTypeByKey: getRelationshipTypeByKey,
        removeRelationshipType: removeRelationshipType,
        removeRelationshipTypeByKey: removeRelationshipTypeByKey,
        getRelationshipTypeMap: getRelationshipTypeMap,
        getRelationshipTypeArray: getRelationshipTypeArray,
        getConnectedRelationshipTypes: getConnectedRelationshipTypes,
        getOutboundNodeLabelStringRelationshipTypeStringMap: getOutboundNodeLabelStringRelationshipTypeStringMap,
        getOutboundNodeLabelKeyRelationshipTypeMap: getOutboundNodeLabelKeyRelationshipTypeMap,
        getConnectedNodeLabels: getConnectedNodeLabels,
        getConnectedRelationshipTypeBetweenNodeLabels: getConnectedRelationshipTypeBetweenNodeLabels,
        getNodeLabelsThatHaveSelfConnectedRelationships: getNodeLabelsThatHaveSelfConnectedRelationships,
        getNodeLabelPairsThatHaveMoreThanOneRelationshipBetweenThem: getNodeLabelPairsThatHaveMoreThanOneRelationshipBetweenThem,
        getMatchingSubgraph: getMatchingSubgraph,
        getPath: getPath,
        doesMatchingRelationshipTypeExist: doesMatchingRelationshipTypeExist,
        getRelationshipType: getRelationshipType,
        getRelationshipTypesByType: getRelationshipTypesByType,
        toCypher: toCypher,
        toCypherArray: toCypherArray,
        toArrowsStyleCypher: toArrowsStyleCypher,
        getConstraintStatements: getConstraintStatements,
        getDataModelNodeCypherStatement: getDataModelNodeCypherStatement,
        toJSON: toJSON,
        fromJSON: fromJSON,
        toSaveObject: toSaveObject,
        toExportObject: toExportObject,
        fromSaveObject: fromSaveObject,
        dataChanged: dataChanged,
        setDataChanged: setDataChanged,
        addDataChangeListener: addDataChangeListener,
        removeDataChangeListener: removeDataChangeListener,
        resetDataChangeFlags: resetDataChangeFlags,
        resetPositionUpdateFlags: resetPositionUpdateFlags,
        getChangedItems: getChangedItems,
        getDeletedItems: getDeletedItems,
        getIsRemotelyPersisted: getIsRemotelyPersisted,
        setIsRemotelyPersisted: setIsRemotelyPersisted,
        findItemsByText: findItemsByText,
        getSecondaryNodeLabels: getSecondaryNodeLabels,
        getNodeLabelsWhereIAmSecondary: getNodeLabelsWhereIAmSecondary,
        getAllSecondaryNodeLabelProperties: getAllSecondaryNodeLabelProperties,
        addSecondaryNodeLabel: addSecondaryNodeLabel,
        setSecondaryNodeLabels: setSecondaryNodeLabels,
        removeSecondaryNodeLabel: removeSecondaryNodeLabel,
        createNewSecondaryNodeLabel: createNewSecondaryNodeLabel,
        processLabel: processLabel,
        getPrimaryNodeLabelAndEnsureSecondaryNodeLabels: getPrimaryNodeLabelAndEnsureSecondaryNodeLabels,
        createPrimaryNodeLabelWithSecondaryNodeLabels: createPrimaryNodeLabelWithSecondaryNodeLabels,
        ensureSecondaryNodeLabels: ensureSecondaryNodeLabels,
        getAllCompositeIndexNames: getAllCompositeIndexNames,
        addValidationSectionToExclude: addValidationSectionToExclude,
        removeValidationSectionToExclude: removeValidationSectionToExclude,
        getExcludeValidationSections: getExcludeValidationSections,
        toLLMModelText: toLLMModelText
    }

};
