import React, { Component } from 'react'

import {
  FormControl, InputLabel, MenuItem, Select
} from '@material-ui/core';
import SecurityRole, { SecurityMessages } from '../SecurityRole';
import { ALERT_TYPES } from '../../../common/Constants';
import AccordionBlockNoDrag from '../blocks/AccordionBlockNoDrag';
import BigQuerySource from './bigquery/BigQuerySource';
import Neo4jSource from './neo4j/Neo4jSource';

const Sizes = {
    ToolbarHeight: '40px'
}

const DomIds = {
    Main: "main",
    DataSourceTop: "DataSourceTop",
    BottomOfSource: "BottomOfSource",
    DataSourceTables: "DataSourceTables"
  };

export const DataSourceTypes = {
  BigQuery: "BigQuery",
  Neo4j: "Neo4j"
}  

const pxVal = (px) => typeof (px) === 'string' ? parseInt(px.replace(/px$/, '')) : px;

export default class DataSource extends Component {

    state = {
        tableHeight: 400,
        dataSourceTableBlocks: [],
        dataSourceType: DataSourceTypes.BigQuery,
        minHeight: 0
    }

    constructor(props) {
        super(props)
        this.bigQuerySourceRef = React.createRef();
        this.neo4jSourceRef = React.createRef();

        // Below 2 lines were for testing
        //var generalDataSource = createSampleDataDefinition();        
        //this.state.tableCatalog = generalDataSource;
        //getDataProvider().setProjectId(this.state.projectId);        
    }

    componentDidMount = () => {
        this.setAvailableMappingDestinations(this.props.availableMappingDestinations);        
    }

    reset = () => {
        this.setState({
            tableHeight: 400,
            dataSourceTableBlocks: [],
            dataSourceType: DataSourceTypes.BigQuery,
            minHeight: 0
        });

        if (this.bigQuerySourceRef.current) {
            this.bigQuerySourceRef.current.reset();
        }
        if (this.neo4jSourceRef.current) {
            this.neo4jSourceRef.current.reset();
        }
    }

    setDataSourceTableBlocks = (dataSourceTableBlocks) => {
        this.setState({
            dataSourceTableBlocks
        });
    }

    updateStateFromDataProvider = () => {
      const { getDataProvider } = this.props;
      const dataProvider = getDataProvider();        
      this.setState({
        dataSourceType: dataProvider.getDataSourceType() || DataSourceTypes.BigQuery
      })
      if (this.bigQuerySourceRef.current) {
          this.bigQuerySourceRef.current.updateStateFromDataProvider();
      }
      if (this.neo4jSourceRef.current) {
          this.neo4jSourceRef.current.updateStateFromDataProvider();
      }
    }

    /*
    setTableHeight = () => {
        var { cypherBuilder } = this.props;

        var bottomDrawerOpenHeight = cypherBuilder.getBottomDrawerOpenHeight();
        var cypherEditorOffset = cypherBuilder.getSizeValue('CypherEditorOffset');
        var height = bottomDrawerOpenHeight - cypherEditorOffset - pxVal(Sizes.ToolbarHeight);

        this.setState({
            tableHeight: height
        })
    }*/

    // event.target.value is selected availableMappingDestination.key

    addDataSourceTableBlock = ({tableDefinition, position, scrollIntoView}, callback) => {
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();        
        if (SecurityRole.canEdit()) {
          scrollIntoView = (typeof(scrollIntoView) !== 'boolean') ? true: scrollIntoView;
          if (typeof position === "number" || position === "end") {
            var newBlock = dataProvider.getNewDataSourceTable({
              tableDefinition,
              position,
              scrollIntoView: scrollIntoView
            });
            const { dataSourceTableBlocks } = this.state;
            var newDataSourceTableBlocks = dataSourceTableBlocks.slice();
            if (position === "end") {
                newDataSourceTableBlocks.push(newBlock);
            } else {
                newDataSourceTableBlocks.splice(position, 0, newBlock);
            }
      
            /*
            try {
                console.log('newDataSourceTableBlocks len: ', newDataSourceTableBlocks.length);
                newDataSourceTableBlocks.map(x => console.log(x.key));
                throw new Error('printing Stack trace to find out why there are duplicate keys')
            } catch (e) {
                console.log(e);
            }*/

            this.setState(
              {
                dataSourceTableBlocks: newDataSourceTableBlocks,
              },
              () => {
                this.calculatePageSize();
                if (callback) {
                  callback();
                }
              }
            );
          } else {
            alert(`addDataSourceTableBlock, bad position: ${position}`);
          }
        } else {
          alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
        }
      };
    
      toggleAccordionPanel = (dataSourceTableBlock) => () => {
        var { dataSourceTableBlocks } = this.state;
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();        
        var newDataSourceTableBlocks = dataSourceTableBlocks.slice();
        var index = newDataSourceTableBlocks.findIndex((x) => x.key === dataSourceTableBlock.key);
        var isExpanded = true;
        if (index >= 0) {
          const blockToToggle = newDataSourceTableBlocks[index];
          isExpanded = !blockToToggle.expanded;
          blockToToggle.expanded = isExpanded;
    
          this.setState(
            {
              dataSourceTableBlocks: newDataSourceTableBlocks,
            },
            () => {
              this.calculatePageSize();
              dataProvider.setBlockState({
                key: dataSourceTableBlock.key,
                expanded: isExpanded,
                selected: dataSourceTableBlock.selected,
              });
            }
          );
        }
      };
    
      selectAccordionPanel = (dataSourceTableBlock) => () => {
        var { dataSourceTableBlocks } = this.state;
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();        

        var newDataSourceTableBlocks = dataSourceTableBlocks.slice();
        var index = newDataSourceTableBlocks.findIndex((x) => x.key === dataSourceTableBlock.key);
        var isSelected = true;
        if (index >= 0) {
          newDataSourceTableBlocks.map((block, i) => {
            if (i !== index && block.selected) {
              // ignore the block we are selecting, it gets handled later
              // save it if we change a selected block to unselected
              dataProvider.setBlockState({
                key: block.key,
                expanded: block.expanded,
                selected: false,
              });
              block.selected = false;
            }
          });
    
          const blockToSelect = newDataSourceTableBlocks[index];
          isSelected = !blockToSelect.selected;
          blockToSelect.selected = isSelected;
    
          this.setState(
            {
              dataSourceTableBlocks: newDataSourceTableBlocks,
            },
            dataProvider.setBlockState({
              key: dataSourceTableBlock.key,
              expanded: dataSourceTableBlock.expanded,
              selected: isSelected,
            })
          );
        }
      };
    
      removeAccordionPanel = (dataSourceTableBlock) => () => {
        var { dataSourceTableBlocks } = this.state;
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();        

        var newDataSourceTableBlocks = dataSourceTableBlocks.slice();
        var index = newDataSourceTableBlocks.findIndex((x) => x.key === dataSourceTableBlock.key);
    
        if (index >= 0) {
          newDataSourceTableBlocks.splice(index, 1);
        }
    
        this.setState(
          {
            dataSourceTableBlocks: newDataSourceTableBlocks,
          },
          () => {
            //this.calculatePageSize();
            dataProvider.removeBlock({
              key: dataSourceTableBlock.key,
            });
          }
        );
      };

    calculatePageSize = () => {
        setTimeout(() => {
          //console.log("calculatePageSize called");
          var { dataSourceTableBlocks } = this.state;
          const newMinHeight = dataSourceTableBlocks
            .map((block) => {
              const el = document.getElementById(this.getBlockDomId(block.key));
              return el && el.getBoundingClientRect
                ? el.getBoundingClientRect().height
                : 0;
            })
            .reduce(
              (totalPageSize, blockPageSize) => totalPageSize + blockPageSize,
              Sizes.PageBottomPadding
            );
    
          this.setState({
            minHeight: newMinHeight,
          });
        }, 100);
      };

    getBlockDomId = (dataSourceTableBlockKey) => {
        return `datasourcetableblock_${dataSourceTableBlockKey}`;
    };

    getPageSize = () => {
        const { minHeight } = this.state;
        return minHeight;
    };

    getScrollTop = () => {
        const mainEl = document.getElementById(DomIds.Main);
        return mainEl.scrollTop;
    };

    setScrollTop = (scrollTop) => {
        const mainEl = document.getElementById(DomIds.Main);
        return (mainEl.scrollTop = scrollTop);
    };

    scrollPane = (amount) => {
        const mainEl = document.getElementById(DomIds.Main);
        mainEl.scrollTop += amount;
    };

    getBottomDrawerHeight = () => 0;
    
    scrollIntoView = ({ domElement, detailsDomElement }) => {
        const elementRect = domElement.getBoundingClientRect();
        const addControlElement = document.getElementById(
          DomIds.BottomOfSource
        );
        const addControlRect = addControlElement.getBoundingClientRect();
        const mainEl = document.getElementById(DomIds.Main);
    
        const topOfViewport = addControlRect.y + addControlRect.height + 20;
        const bottomOfViewport =
          window.innerHeight - pxVal(this.getBottomDrawerHeight()) - 30;
        var scrollChange = 0;
    
        if (elementRect.bottom > bottomOfViewport) {
          scrollChange = elementRect.bottom - bottomOfViewport;
        }
    
        // this one takes precedence
        if (elementRect.y - scrollChange < topOfViewport) {
          scrollChange = elementRect.y - topOfViewport;
        }
    
        if (scrollChange) {
          mainEl.scrollTop += scrollChange;
        }
    
        /*
            console.log('scrollChange: ', scrollChange);
            console.log('scrollTopMain: ', mainEl.scrollTop);
            console.log('newScrollTopMain: ', mainEl.scrollTop);
            console.log('elementRect: ', elementRect);
            console.log('addControlRect: ', addControlRect);
            */
    
        // - pulse new block
        setTimeout(() => {
          detailsDomElement.classList.add("focusBlock");
          setTimeout(
            () => detailsDomElement.classList.remove("focusBlock"),
            250
          );
        }, 100);
    };

    closeGeneralDialog = () => {
        const { parentContainer } = this.props;
        parentContainer.closeGeneralDialog();
    }

    showGeneralDialog = (title, description, buttons) => {
        const { parentContainer } = this.props;
        parentContainer.showGeneralDialog(title, description, buttons);
    }

    setAvailableMappingDestinations = (availableMappingDestinations) => {
        const { dataSourceTableBlocks } = this.state;
        dataSourceTableBlocks.map(dataSourceTableBlock => {
            if (dataSourceTableBlock.ref.current) {
                dataSourceTableBlock.ref.current.setAvailableMappingDestinations(availableMappingDestinations);
            }
        });
    }

    resetChosenType = (chosenType) => {
      const { getDataProvider } = this.props;
      const dataProvider = getDataProvider();        

      switch (chosenType) {
        case DataSourceTypes.BigQuery:
          dataProvider.clearBigQueryFields();
          if (this.bigQuerySourceRef.current) {
            this.bigQuerySourceRef.current.reset();
            this.bigQuerySourceRef.current.updateStateFromDataProvider();
          }
          break;
        case DataSourceTypes.Neo4j:
          dataProvider.clearNeo4jSourceFields();
          if (this.neo4jSourceRef.current) {
            this.neo4jSourceRef.current.reset();
            this.neo4jSourceRef.current.updateStateFromDataProvider();
          }
          break;
      }
    }

    restoreNewType = (newType) => {
      switch (newType) {
        case DataSourceTypes.BigQuery:
          if (this.bigQuerySourceRef.current) {
            this.bigQuerySourceRef.current.updateStateFromDataProvider();
          }
          break;
        case DataSourceTypes.Neo4j:
          if (this.neo4jSourceRef.current) {
            this.neo4jSourceRef.current.updateStateFromDataProvider();
          }
          break;
      }
    }

    getDataSourceType = () => this.state.dataSourceType;

    setDataSourceType = (e) => {
      const { dataSourceType, dataSourceTableBlocks } = this.state;
      const { parentContainer, getDataProvider } = this.props;
      const dataProvider = getDataProvider();

      const newValue = e.target.value;
      if (dataSourceType !== newValue) {
        if (dataSourceTableBlocks.length > 0) {
          const description = 'If you change the Data Source Type, you will lose your existing mappings. Proceed?'
          parentContainer.showGeneralDialog("Switch Input Data Source", description, [
            {
              text: "Yes",
              onClick: (button, index) => {
                this.resetChosenType(dataSourceType);
                parentContainer.closeGeneralDialog();
                this.setState({
                  dataSourceType: newValue,
                  dataSourceTableBlocks: []
                }, () => {
                  dataProvider.setDataSourceType(newValue);
                  this.restoreNewType(newValue);
                });
              },
              autofocus: false,
            },
            {
              text: "No",
              onClick: (button, index) => parentContainer.closeGeneralDialog(),
              autofocus: true,
            },
          ]);
        } else {
          this.setState({
            dataSourceType: newValue
          }, () => {
            dataProvider.setDataSourceType(newValue);
            this.restoreNewType(newValue);
          });
        }
      }
    }

    getNeo4jDatabaseConnection = () => {
      if (this.neo4jSourceRef.current) {
        return this.neo4jSourceRef.current.getNeo4jDatabaseConnection();
      } else {
        return null;
      }
    }

    getNeo4jDatabaseLabel = () => {
      if (this.neo4jSourceRef.current) {
        return this.neo4jSourceRef.current.getNeo4jDatabaseConnection();
      } else {
        return null;
      }
    }

    render() {
        var {
            dataSourceTableBlocks,
            dataSourceType
        } = this.state;

        var {
            getDataProvider,
            parentContainer
        } = this.props;

        return (
            <>
                <div id={DomIds.DataSourceTop} style={{ padding: '3px' }}>
                    <FormControl variant="outlined" style={{ marginBottom: '.575em' }}>
                        <InputLabel htmlFor="selectedDataSourceType-label" style={{ transform: 'translate(3px, 3px) scale(0.75)' }}>
                            Select a Data Source Type
                        </InputLabel>
                        <Select
                            value={dataSourceType}
                            onChange={this.setDataSourceType}
                            id="selectedDataSourceType"
                            inputProps={{
                                name: 'selectedDataSourceType',
                                id: 'selectedDataSourceType-label',
                            }}
                            style={{ width: '13em', height: '3em', marginRight: '.5em' }}
                        >
                            {Object.keys(DataSourceTypes).map(dataSourceTypeKey =>
                                <MenuItem key={dataSourceTypeKey} value={dataSourceTypeKey}>{DataSourceTypes[dataSourceTypeKey]}</MenuItem>
                            )}
                        </Select>
                    </FormControl>
                    {dataSourceType === DataSourceTypes.BigQuery && 
                      <BigQuerySource 
                        ref={this.bigQuerySourceRef}
                        addDataSourceTableBlock={this.addDataSourceTableBlock}
                        getDataProvider={getDataProvider}
                      />
                    }
                    {dataSourceType === DataSourceTypes.Neo4j && 
                      <Neo4jSource 
                        ref={this.neo4jSourceRef}
                        addDataSourceTableBlock={this.addDataSourceTableBlock}
                        parentContainer={parentContainer}
                        persistenceHelper={parentContainer.getPersistenceHelper()}
                        communicationHelper={parentContainer.getCommunicationHelper()}
                        getDataProvider={getDataProvider}
                      />
                    }
                    <div style={{height: '1px', width: '100%'}} id={DomIds.BottomOfSource}></div>
                </div>
                <div id={DomIds.DataSourceTables} style={{ 
                    height: 'calc(100vh - 250px)',
                    overflow: 'scroll', 
                    display: 'flex', 
                    flexFlow: 'column' 
                }}>
                {dataSourceTableBlocks.map((dataSourceTableBlock, index) => 
                    <AccordionBlockNoDrag
                        key={dataSourceTableBlock.key}
                        blockKey={dataSourceTableBlock.key}
                        domId={this.getBlockDomId(dataSourceTableBlock.key)}
                        expanded={dataSourceTableBlock.expanded}
                        selected={dataSourceTableBlock.selected}
                        scrollIntoView={dataSourceTableBlock.scrollIntoView}
                        workStatus={dataSourceTableBlock.getWorkStatus()}
                        workStatusMessage={dataSourceTableBlock.getWorkMessage()}
                        showToggleTool={dataSourceTableBlock.showToggleTool}
                        parentContainer={this}
                        dataProvider={dataSourceTableBlock.dataProvider}
                        selectAccordionPanel={this.selectAccordionPanel(dataSourceTableBlock)}
                        toggleAccordionPanel={this.toggleAccordionPanel(dataSourceTableBlock)}
                        removeAccordionPanel={this.removeAccordionPanel(dataSourceTableBlock)}
                        addMode={false}
                        rightWidthOffset={0}                
                        firstBlock={index === 0}
                    >
                        {dataSourceTableBlock.blockElement}
                    </AccordionBlockNoDrag>
                )}
                </div>
            </>
        )
    }
}
