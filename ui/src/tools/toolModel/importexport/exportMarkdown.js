import { marked } from 'marked';
import { getAppName } from '../../../dynamicConfig';

export class DataModelMarkdown {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            dataModel,
            dataModelMetadata
        } = properties;

        this.dataModel = dataModel;
        this.dataModelMetadata = dataModelMetadata;
    }

    sortByProperty = (property) => (a,b) => (a[property] === b[property]) ? 0 : (a[property] > b[property]) ? 1 : -1

    stripLeadingSpaces (textBlock) {
        var howManySpaces = 0;
        var firstLineProcessed = false;
        var spaces = '';
        var spacesRegex = null;
        var strippedText = textBlock.split('\n').map((line,i) => {
            if (!firstLineProcessed && line.trim().length > 0) {
                howManySpaces = line.indexOf(line.trim());
                for (var i = 0; i < howManySpaces; i++) { spaces += ' ' }
                firstLineProcessed = true;
                spacesRegex = new RegExp(`^${spaces}`);
            } 
            if (spacesRegex) {
                return line.replace(spacesRegex, '');
            } else {
                return line;
            }
        }).join('\n');
        return strippedText;
    }

    collapseEmptyLines (textBlock) {
        var previousLineEmpty = false;
        var lines = textBlock.split('\n')
            .filter(line => {
                var isEmpty = line.trim().length === 0;
                var result = (isEmpty && previousLineEmpty) ? false : true;
                previousLineEmpty = isEmpty;
                return result;
            });
        return lines.join('\n');
    }

    getNodeLabels (model) {
        var nodeLabels = model.getNodeLabelArray();
        nodeLabels.sort(this.sortByProperty('label'));
        return nodeLabels;
    }

    getRelationshipTypes (model) {
        var relationshipTypes = model.getRelationshipTypeArray();
        relationshipTypes = relationshipTypes.filter(relationshipType => {
            if (relationshipType.startNodeLabel.isOnlySecondaryNodeLabel ||
                relationshipType.endNodeLabel.isOnlySecondaryNodeLabel) {
                return false;
            } else {
                return true;
            }
        });
        relationshipTypes.sort(this.sortByProperty('type'));
        return relationshipTypes;
    }

    getModelStats (model) {
        var nodeLabels = this.getNodeLabels(model);
        var relationshipTypes = this.getRelationshipTypes(model);
        
        var numNodeLabelProperties = nodeLabels.reduce((acc, x) => acc + Object.keys(x.properties).length, 0);
        var numRelationshipTypeProperties = relationshipTypes.reduce((acc, x) => acc + Object.keys(x.properties).length, 0);

        return `${nodeLabels.length} node labels, ${relationshipTypes.length} relationship types,
            ${numNodeLabelProperties} node label properties, ${numRelationshipTypeProperties} relationship type properties`;
    }

    getTableOfContents (model) {
        var nodeLabels = this.getNodeLabels(model);
        var nodeLabelContents = nodeLabels.map(x => `* ${this.getNodeLabelLink(x)}`).join('\n');
        
        var relationshipTypes = this.getRelationshipTypes(model);
        var relationshipTypeContents = relationshipTypes.map(x => `* [${this.getRelationshipTypeTitle(x)}](#${x.key})`).join('\n');

        var markdown = `

            ### Table of Contents

            #### Node Labels
            ${nodeLabelContents}

            #### Relationship Types
            ${relationshipTypeContents}
        `
        return markdown;
    }

    getMetadataMarkdown (metadata, model) {
        var markdown = '';
        markdown = `
            # <a id='_modelTop'></a>${metadata.title}

            **Date:** ${new Date().toDateString()}  
            **${getAppName()} Version:** ${metadata.cypherWorkbenchVersion}  `;

        if (metadata.description) {
            markdown += `
            **Description:** ${metadata.description}  `;
        }

        if (metadata.notes) {
            markdown += `
            **Notes:** ${metadata.description}  `;
        }

        if (metadata.customers && metadata.customers.length > 0) {
            markdown += `
            **Customers:** ${metadata.customers.map(x => x.name).join(', ')}  `;
        }

        if (metadata.tags && metadata.tags.length > 0) {
            markdown += `
            **Tags:** ${metadata.tags.map(x => x.tag).join(', ')}  `;
        }

        markdown += `
            **Stats:**  ${this.getModelStats(model)}  `;

        return markdown;
    }

    getPropertyDefinitionMarkdown (propertyDefinition) {
        var markdown = `
            **${propertyDefinition.name}**  
            Datatype: ${propertyDefinition.datatype}  `;

        if (propertyDefinition.referenceData) {
            markdown += `
            Reference Data: ${propertyDefinition.referenceData}  `
        }

        var flags = {
            isPartOfKey: "Node Key", 
            hasUniqueConstraint: "Unique Constraint",
            isIndexed: "Indexed", 
            mustExist: "Must Exist"
        }
        var flagStr = Object.keys(flags)
            .filter(flag => propertyDefinition[flag])
            .map(flag => flags[flag])
            .join(', ');

        if (flagStr) {
            markdown += `
            ${flagStr}  `
        }

        if (propertyDefinition.description) {
            markdown += `
            ${propertyDefinition.description}  `
        }

        return markdown;
    }

    getPropertiesMarkdown (properties, options) {
        if (!properties) {
            return '';
        }
        var propertyDefinitionArray = Object.values(properties);
        if (propertyDefinitionArray.length === 0) {
            return '';
        }

        var mustExistOnly = false;
        var label = '';
        if (options) {
            mustExistOnly = options.mustExistOnly;
            label = (options.label) ? options.label : '';
        }

        // sort alphabetically
        propertyDefinitionArray.sort(this.sortByProperty('name'));
        var keyProperties = propertyDefinitionArray.filter(x => x.isPartOfKey);
        var uniqueProperties = propertyDefinitionArray.filter(x => x.hasUniqueConstraint);
        var indexedProperties = propertyDefinitionArray.filter(x => x.isIndexed);
        var mustExistProperties = propertyDefinitionArray.filter(x => x.mustExist);

        var propertiesBlock = '';
        if (keyProperties.length > 0 && !mustExistOnly) {
            propertiesBlock = `
            Node Key: ${keyProperties.map(x => x.name).join(', ')}  `
        }
        if (uniqueProperties.length > 0 && !mustExistOnly) {
            propertiesBlock += `
            Unique Constraint Properties: ${uniqueProperties.map(x => x.name).join(', ')}  `
        }
        if (indexedProperties.length > 0 && !mustExistOnly) {
            propertiesBlock += `
            Indexed Properties: ${indexedProperties.map(x => x.name).join(', ')}  `
        }
        if (mustExistProperties.length > 0) {
            propertiesBlock += `
            Must Exist Properties: ${mustExistProperties.map(x => x.name).join(', ')}  `
        }
        propertiesBlock += `
            ${propertyDefinitionArray.map(x => this.getPropertyDefinitionMarkdown(x)).join('  \n')}  `

        var markdown = `

            #### ${label} Properties
            ${propertiesBlock}  `;

        return markdown;
    }

    getCompositeIndexMarkdown (nodeLabel) {
        if (!nodeLabel.indexes || nodeLabel.indexes.length === 0) {
            return '';
        }

        var indexBlock = nodeLabel.indexes.map(indexDefinition => {
            var indexName = (indexDefinition.indexName) ? indexDefinition.indexName : '&lt;unnamed&gt;';
            var indexProperties = indexDefinition.propertyDefinitionKeys
                .map(key => nodeLabel.properties[key])
                .filter(propertyDefinition => propertyDefinition)
                .map(propertyDefinition => propertyDefinition.name)
                .join(', ');
            return `**${indexName}**: ${indexProperties}`;
        }).join('  \n');

        var markdown = `

            #### ${nodeLabel.label} Composite Indexes
            ${indexBlock}  `;
        return markdown;
    }

    getNodeLabelMarkdown (nodeLabel) {
        var markdown = '';
        markdown += `
            ### <a id='${nodeLabel.key}'></a>${nodeLabel.label} <span style="font-size:0.7em;">[[top]](#_modelTop)</span>
            ---  `;

        if (nodeLabel.secondaryNodeLabelKeys && nodeLabel.secondaryNodeLabelKeys.length > 0) {
            var secondaryNodeLabels = nodeLabel.secondaryNodeLabelKeys.map(key => 
                this.getNodeLabelLink(this.dataModel.getNodeLabelByKey(key))
            )
            markdown += `
            **Secondary Node Labels:** ${secondaryNodeLabels.join(', ')}  `;
        }

        if (nodeLabel.description) {
            markdown += `
            ${nodeLabel.description}  `;
        }

        markdown += this.getNodeLabelRelationshipsMarkdown(nodeLabel);
        markdown += this.getPropertiesMarkdown (nodeLabel.properties, { label: nodeLabel.label});
        markdown += this.getCompositeIndexMarkdown (nodeLabel);

        return markdown;
    }

    getNodeLabelRelationshipsMarkdown (nodeLabel) {
        var nodeLabelRelationships = this.dataModel.getRelationshipTypesForNodeLabelByKey(nodeLabel.key);

        nodeLabelRelationships.sort(this.sortByProperty('type'));

        var outbound = nodeLabelRelationships
                .filter(x => x.startNodeLabel === nodeLabel)
                .filter(x => !x.endNodeLabel.isOnlySecondaryNodeLabel);
        var inbound = nodeLabelRelationships
                .filter(x => x.endNodeLabel === nodeLabel)
                .filter(x => !x.startNodeLabel.isOnlySecondaryNodeLabel);

        var markdown = '';

        if (outbound.length > 0) {
            markdown += `

            #### ${nodeLabel.label} Outbound Relationships

            ${outbound.map(x => this.getSimpleOutboundRelationshipTypeMarkdown(x)).join('  \n')}  `;
        }

        if (inbound.length > 0) {
            markdown += `

            #### ${nodeLabel.label} Inbound Relationships

            ${inbound.map(x => this.getSimpleInboundRelationshipTypeMarkdown(x)).join('  \n')}  `;
        }

        return markdown;
    }

    getSimpleOutboundRelationshipTypeMarkdown (relationshipType) {
        return `${relationshipType.startNodeLabel.label} - ${this.getRelationshipTypeLink(relationshipType)} -> ${this.getNodeLabelLink(relationshipType.endNodeLabel)}`;
    }

    getSimpleInboundRelationshipTypeMarkdown (relationshipType) {
        return `${this.getNodeLabelLink(relationshipType.startNodeLabel)} - ${this.getRelationshipTypeLink(relationshipType)} -> ${relationshipType.endNodeLabel.label}`;
    }

    getSimpleRelationshipTypeMarkdown (relationshipType) {
        return `${this.getNodeLabelLink(relationshipType.startNodeLabel)} - ${relationshipType.getRelationshipDisplayText()} -> ${this.getNodeLabelLink(relationshipType.endNodeLabel)}`;
    }

    getNodeLabelsMarkdown (nodeLabels) {
        return `

            ## Node Labels
            --------------
            ${nodeLabels.map(x => this.getNodeLabelMarkdown(x)).join('  \n')}  `
    }

    getNodeLabelLink (nodeLabel) {
        return `[${nodeLabel.label}](#${nodeLabel.key})`
    }

    getRelationshipTypeLink (relationshipType) {
        return `[${relationshipType.getRelationshipDisplayText()}](#${relationshipType.key})`
    }

    getRelationshipTypeTitle (relationshipType) {
        return `${(relationshipType.type) ? relationshipType.type : `(${relationshipType.key})`}`;        
    }

    getRelationshipTypeMarkdown (relationshipType) {
        var markdown = '';
        markdown += `
            ### <a id='${relationshipType.key}'></a>${this.getRelationshipTypeTitle(relationshipType)} <span style="font-size:0.7em;">[[top]](#_modelTop)</span>
            ---
            ${this.getSimpleRelationshipTypeMarkdown(relationshipType)}  `;

        if (relationshipType.description) {
            markdown += `
            ${relationshipType.description}  `;
        }

        markdown += this.getPropertiesMarkdown (relationshipType.properties, { label: relationshipType.type, mustExistOnly: true});
        return markdown;
    }

    getRelationshipTypesMarkdown (relationshipTypes) {
        return `

            ## Relationship Types
            --------------
            ${relationshipTypes.map(x => this.getRelationshipTypeMarkdown(x)).join('  \n')}  `
    }

    getModelMarkdown (model) {
        var markdown = '';

        var nodeLabels = this.getNodeLabels(model);
        var relationshipTypes = this.getRelationshipTypes(model);

        markdown += this.getNodeLabelsMarkdown(nodeLabels);
        markdown += this.getRelationshipTypesMarkdown(relationshipTypes);

        return markdown;
    }

    getMarkdown () {
        var markdown = '';

        markdown += this.getMetadataMarkdown(this.dataModelMetadata, this.dataModel);
        markdown += this.getTableOfContents(this.dataModel);
        markdown += this.getModelMarkdown(this.dataModel);
        
        markdown = this.stripLeadingSpaces(markdown);
        markdown = this.collapseEmptyLines(markdown);
        return markdown;
    }

    getHtmlWithFormatting () {
        var modelHtml = marked(this.getMarkdown());        
        var html = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
            <head>
                <meta charset="utf-8">
                <title>${this.dataModelMetadata.title}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css">
                <style>
                    body {
                        box-sizing: border-box;
                        min-width: 200px;
                        max-width: 980px;
                        margin: 0 auto;
                        padding: 45px;
                    }
                </style>
            </head>
            <body>
                <article class="markdown-body">     
                ${modelHtml}       
                </article>
            </body>
        </html>
        `    
        return html;
    }

}